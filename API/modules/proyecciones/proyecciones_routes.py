from decimal import Decimal
from datetime import date, datetime

from flask import request
from flask_restx import Resource
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError


VALID_PROJECTION_STATES = {
    "PENDIENTE",
    "CONFIRMADA",
    "RECHAZADA",
    "REPROGRAMADA",
}


def serialize_model(instance):
    """
    Convierte una instancia reflejada por automap en un diccionario JSON-safe.
    """
    result = {}

    for column in instance.__table__.columns:
        value = getattr(instance, column.name)

        if isinstance(value, Decimal):
            result[column.name] = float(value)
        elif isinstance(value, (datetime, date)):
            result[column.name] = value.isoformat()
        else:
            result[column.name] = value

    return result


def get_table_class(tabla_clases, table_name):
    table_class = tabla_clases.get(table_name)

    if not table_class:
        raise RuntimeError(
            f"No se encontró la tabla '{table_name}'. "
            "Verifica que exista en la base de datos y reinicia la API."
        )

    return table_class


def has_column(model_class, column_name):
    return column_name in model_class.__table__.columns


def clean_text(value):
    return str(value or "").strip()


def parse_positive_amount(value, field_name="monto"):
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None, f"El campo '{field_name}' debe ser numérico."

    if amount <= 0:
        return None, f"El campo '{field_name}' debe ser mayor a cero."

    return amount, None


def parse_date(value, field_name):
    if not value:
        return None, f"El campo '{field_name}' es obligatorio."

    try:
        return datetime.strptime(value, "%Y-%m-%d").date(), None
    except (TypeError, ValueError):
        return None, f"El campo '{field_name}' debe tener formato YYYY-MM-DD."


def get_projection_for_user(db, proyeccion_cls, id_proyeccion, id_usuario):
    return (
        db.session.query(proyeccion_cls)
        .filter(proyeccion_cls.id_proyeccion == id_proyeccion)
        .filter(proyeccion_cls.id_usuario == id_usuario)
        .first()
    )


def get_account_for_user(db, cuenta_cls, id_cuenta, id_usuario):
    return (
        db.session.query(cuenta_cls)
        .filter(cuenta_cls.id_cuenta == id_cuenta)
        .filter(cuenta_cls.id_usuario == id_usuario)
        .first()
    )


def get_allowed_category(db, categoria_cls, id_categoria, id_usuario):
    return (
        db.session.query(categoria_cls)
        .filter(categoria_cls.id_categoria == id_categoria)
        .filter(categoria_cls.activa == True)
        .filter(
            or_(
                categoria_cls.id_usuario == None,
                categoria_cls.id_usuario == id_usuario,
            )
        )
        .first()
    )


def calculate_account_balance(db, cuenta, transaccion_cls, categoria_cls):
    """
    Calcula saldo actual real de una cuenta:
    saldo_inicial + ingresos reales - gastos reales.

    Las proyecciones no se incluyen aquí.
    """
    saldo_inicial = float(getattr(cuenta, "saldo_inicial", 0) or 0)

    transactions = (
        db.session.query(transaccion_cls, categoria_cls)
        .join(
            categoria_cls,
            transaccion_cls.id_categoria == categoria_cls.id_categoria,
        )
        .filter(transaccion_cls.id_cuenta == cuenta.id_cuenta)
        .all()
    )

    ingresos = 0
    gastos = 0

    for transaction, category in transactions:
        amount = float(transaction.monto or 0)

        if category.tipo_movimiento == "INGRESO":
            ingresos += amount

        if category.tipo_movimiento == "GASTO":
            gastos += amount

    return saldo_inicial + ingresos - gastos


def serialize_projection(db, projection, cuenta_cls, categoria_cls):
    """
    Devuelve la proyección enriquecida con datos útiles para el frontend.
    """
    data = serialize_model(projection)

    account = (
        db.session.query(cuenta_cls)
        .filter(cuenta_cls.id_cuenta == projection.id_cuenta)
        .first()
    )

    category = (
        db.session.query(categoria_cls)
        .filter(categoria_cls.id_categoria == projection.id_categoria)
        .first()
    )

    today = date.today()
    scheduled_date = projection.fecha_programada

    if isinstance(scheduled_date, datetime):
        scheduled_date = scheduled_date.date()

    data["cuenta_nombre"] = account.nombre if account else "Cuenta no encontrada"
    data["cuenta_activa"] = bool(account.activa) if account else False
    data["categoria_nombre"] = category.nombre if category else "Categoría no encontrada"
    data["tipo_movimiento"] = category.tipo_movimiento if category else None
    data["dias_restantes"] = (scheduled_date - today).days if scheduled_date else None
    data["esta_vencida"] = bool(
        scheduled_date
        and scheduled_date < today
        and projection.estado in ["PENDIENTE", "REPROGRAMADA"]
    )
    data["es_para_hoy"] = bool(
        scheduled_date
        and scheduled_date == today
        and projection.estado in ["PENDIENTE", "REPROGRAMADA"]
    )

    return data


def register_proyecciones_routes(api, db, tabla_clases, jwt_required):
    proyecciones_ns = api.namespace(
        "finanzas/proyecciones",
        path="/finanzas/proyecciones",
        description="Operaciones de negocio para transacciones proyectadas",
    )

    proyeccion_cls = get_table_class(tabla_clases, "transacciones_proyectadas")
    cuenta_cls = get_table_class(tabla_clases, "cuentas")
    categoria_cls = get_table_class(tabla_clases, "categorias")
    transaccion_cls = get_table_class(tabla_clases, "transacciones")

    @proyecciones_ns.route("/")
    @proyecciones_ns.doc(security="Bearer Auth")
    class ProyeccionesResource(Resource):
        @jwt_required
        def get(self):
            """
            Lista las proyecciones del usuario autenticado.

            Parámetros opcionales:
            - estado=PENDIENTE, CONFIRMADA, RECHAZADA, REPROGRAMADA
            - include_closed=true para incluir confirmadas/rechazadas
            """
            id_usuario = request.user.get("id_usuario")
            estado = clean_text(request.args.get("estado")).upper()
            include_closed = request.args.get("include_closed") == "true"

            query = (
                db.session.query(proyeccion_cls)
                .filter(proyeccion_cls.id_usuario == id_usuario)
                .order_by(proyeccion_cls.fecha_programada.asc())
            )

            if estado:
                if estado not in VALID_PROJECTION_STATES:
                    return {"message": "El estado de proyección no es válido."}, 400

                query = query.filter(proyeccion_cls.estado == estado)
            elif not include_closed:
                query = query.filter(
                    proyeccion_cls.estado.in_(["PENDIENTE", "REPROGRAMADA"])
                )

            projections = query.all()

            return [
                serialize_projection(
                    db=db,
                    projection=projection,
                    cuenta_cls=cuenta_cls,
                    categoria_cls=categoria_cls,
                )
                for projection in projections
            ], 200

        @jwt_required
        def post(self):
            """
            Crea una transacción proyectada.

            No afecta saldos, cuentas ni estadísticas reales.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            id_cuenta = data.get("id_cuenta")
            id_categoria = data.get("id_categoria")
            monto, amount_error = parse_positive_amount(data.get("monto"), "monto")
            fecha_programada, date_error = parse_date(
                data.get("fecha_programada"),
                "fecha_programada",
            )
            descripcion = clean_text(data.get("descripcion"))

            if amount_error:
                return {"message": amount_error}, 400

            if date_error:
                return {"message": date_error}, 400

            try:
                id_cuenta = int(id_cuenta)
            except (TypeError, ValueError):
                return {"message": "La cuenta seleccionada no es válida."}, 400

            try:
                id_categoria = int(id_categoria)
            except (TypeError, ValueError):
                return {"message": "La categoría seleccionada no es válida."}, 400

            if fecha_programada < date.today():
                return {
                    "message": "La fecha programada no puede ser anterior a la fecha actual."
                }, 400

            account = get_account_for_user(
                db=db,
                cuenta_cls=cuenta_cls,
                id_cuenta=id_cuenta,
                id_usuario=id_usuario,
            )

            if not account:
                return {"message": "Cuenta no encontrada."}, 404

            if not account.activa:
                return {"message": "No puedes crear proyecciones con una cuenta inactiva."}, 400

            category = get_allowed_category(
                db=db,
                categoria_cls=categoria_cls,
                id_categoria=id_categoria,
                id_usuario=id_usuario,
            )

            if not category:
                return {"message": "Categoría no encontrada o no disponible."}, 404

            projection = proyeccion_cls(
                id_usuario=id_usuario,
                id_cuenta=id_cuenta,
                id_categoria=id_categoria,
                monto=monto,
                fecha_programada=fecha_programada,
                descripcion=descripcion or None,
                estado="PENDIENTE",
            )

            db.session.add(projection)

            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return {"message": "No se pudo crear la proyección."}, 409

            return serialize_projection(
                db=db,
                projection=projection,
                cuenta_cls=cuenta_cls,
                categoria_cls=categoria_cls,
            ), 201

    @proyecciones_ns.route("/pendientes-hoy")
    @proyecciones_ns.doc(security="Bearer Auth")
    class ProyeccionesPendientesHoyResource(Resource):
        @jwt_required
        def get(self):
            """
            Lista proyecciones pendientes cuya fecha programada es hoy o ya venció.

            Este endpoint se puede usar para notificaciones internas.
            """
            id_usuario = request.user.get("id_usuario")
            today = date.today()

            projections = (
                db.session.query(proyeccion_cls)
                .filter(proyeccion_cls.id_usuario == id_usuario)
                .filter(proyeccion_cls.estado.in_(["PENDIENTE", "REPROGRAMADA"]))
                .filter(proyeccion_cls.fecha_programada <= today)
                .order_by(proyeccion_cls.fecha_programada.asc())
                .all()
            )

            return [
                serialize_projection(
                    db=db,
                    projection=projection,
                    cuenta_cls=cuenta_cls,
                    categoria_cls=categoria_cls,
                )
                for projection in projections
            ], 200

    @proyecciones_ns.route("/<int:id_proyeccion>")
    @proyecciones_ns.doc(security="Bearer Auth")
    class ProyeccionResource(Resource):
        @jwt_required
        def get(self, id_proyeccion):
            id_usuario = request.user.get("id_usuario")

            projection = get_projection_for_user(
                db=db,
                proyeccion_cls=proyeccion_cls,
                id_proyeccion=id_proyeccion,
                id_usuario=id_usuario,
            )

            if not projection:
                return {"message": "Proyección no encontrada."}, 404

            return serialize_projection(
                db=db,
                projection=projection,
                cuenta_cls=cuenta_cls,
                categoria_cls=categoria_cls,
            ), 200

        @jwt_required
        def put(self, id_proyeccion):
            """
            Edita una proyección pendiente o reprogramada.
            No permite editar proyecciones confirmadas o rechazadas.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            projection = get_projection_for_user(
                db=db,
                proyeccion_cls=proyeccion_cls,
                id_proyeccion=id_proyeccion,
                id_usuario=id_usuario,
            )

            if not projection:
                return {"message": "Proyección no encontrada."}, 404

            if projection.estado not in ["PENDIENTE", "REPROGRAMADA"]:
                return {
                    "message": "Solo puedes editar proyecciones pendientes o reprogramadas."
                }, 400

            if "id_cuenta" in data:
                try:
                    id_cuenta = int(data.get("id_cuenta"))
                except (TypeError, ValueError):
                    return {"message": "La cuenta seleccionada no es válida."}, 400

                account = get_account_for_user(
                    db=db,
                    cuenta_cls=cuenta_cls,
                    id_cuenta=id_cuenta,
                    id_usuario=id_usuario,
                )

                if not account:
                    return {"message": "Cuenta no encontrada."}, 404

                if not account.activa:
                    return {"message": "No puedes usar una cuenta inactiva."}, 400

                projection.id_cuenta = id_cuenta

            if "id_categoria" in data:
                try:
                    id_categoria = int(data.get("id_categoria"))
                except (TypeError, ValueError):
                    return {"message": "La categoría seleccionada no es válida."}, 400

                category = get_allowed_category(
                    db=db,
                    categoria_cls=categoria_cls,
                    id_categoria=id_categoria,
                    id_usuario=id_usuario,
                )

                if not category:
                    return {"message": "Categoría no encontrada o no disponible."}, 404

                projection.id_categoria = id_categoria

            if "monto" in data:
                monto, amount_error = parse_positive_amount(data.get("monto"), "monto")

                if amount_error:
                    return {"message": amount_error}, 400

                projection.monto = monto

            if "fecha_programada" in data:
                fecha_programada, date_error = parse_date(
                    data.get("fecha_programada"),
                    "fecha_programada",
                )

                if date_error:
                    return {"message": date_error}, 400

                if fecha_programada < date.today():
                    return {
                        "message": "La fecha programada no puede ser anterior a la fecha actual."
                    }, 400

                projection.fecha_programada = fecha_programada

            if "descripcion" in data:
                projection.descripcion = clean_text(data.get("descripcion")) or None

            if projection.estado == "REPROGRAMADA":
                projection.estado = "PENDIENTE"

            if has_column(proyeccion_cls, "updated_at"):
                projection.updated_at = datetime.now()

            db.session.commit()

            return serialize_projection(
                db=db,
                projection=projection,
                cuenta_cls=cuenta_cls,
                categoria_cls=categoria_cls,
            ), 200

        @jwt_required
        def delete(self, id_proyeccion):
            """
            Rechaza la proyección.
            No se elimina físicamente para conservar trazabilidad.
            """
            id_usuario = request.user.get("id_usuario")

            projection = get_projection_for_user(
                db=db,
                proyeccion_cls=proyeccion_cls,
                id_proyeccion=id_proyeccion,
                id_usuario=id_usuario,
            )

            if not projection:
                return {"message": "Proyección no encontrada."}, 404

            if projection.estado == "CONFIRMADA":
                return {"message": "No puedes rechazar una proyección confirmada."}, 400

            projection.estado = "RECHAZADA"

            if has_column(proyeccion_cls, "updated_at"):
                projection.updated_at = datetime.now()

            db.session.commit()

            return {"message": "Proyección rechazada correctamente."}, 200

    @proyecciones_ns.route("/<int:id_proyeccion>/confirmar")
    @proyecciones_ns.doc(security="Bearer Auth")
    class ConfirmarProyeccionResource(Resource):
        @jwt_required
        def post(self, id_proyeccion):
            """
            Confirma una proyección y la convierte en transacción real.

            Solo aquí empieza a afectar:
            - saldo de cuenta;
            - ingresos/gastos;
            - KPIs;
            - estadísticas.
            """
            id_usuario = request.user.get("id_usuario")

            projection = get_projection_for_user(
                db=db,
                proyeccion_cls=proyeccion_cls,
                id_proyeccion=id_proyeccion,
                id_usuario=id_usuario,
            )

            if not projection:
                return {"message": "Proyección no encontrada."}, 404

            if projection.estado not in ["PENDIENTE", "REPROGRAMADA"]:
                return {"message": "Esta proyección ya no está pendiente."}, 400

            account = get_account_for_user(
                db=db,
                cuenta_cls=cuenta_cls,
                id_cuenta=projection.id_cuenta,
                id_usuario=id_usuario,
            )

            if not account:
                return {"message": "Cuenta no encontrada."}, 404

            if not account.activa:
                return {"message": "No puedes confirmar proyecciones de una cuenta inactiva."}, 400

            category = get_allowed_category(
                db=db,
                categoria_cls=categoria_cls,
                id_categoria=projection.id_categoria,
                id_usuario=id_usuario,
            )

            if not category:
                return {"message": "Categoría no encontrada o no disponible."}, 404

            amount = float(projection.monto or 0)

            if category.tipo_movimiento == "GASTO":
                account_balance = calculate_account_balance(
                    db=db,
                    cuenta=account,
                    transaccion_cls=transaccion_cls,
                    categoria_cls=categoria_cls,
                )

                if amount > account_balance:
                    return {
                        "message": (
                            "No puedes confirmar esta proyección porque la cuenta "
                            "no tiene saldo suficiente. "
                            f"Saldo disponible: {account_balance:.2f}."
                        )
                    }, 400

            transaction = transaccion_cls(
                id_cuenta=projection.id_cuenta,
                id_categoria=projection.id_categoria,
                monto=amount,
                fecha_movimiento=date.today(),
                descripcion=projection.descripcion or "Transacción confirmada desde proyección.",
            )

            db.session.add(transaction)
            db.session.flush()

            projection.estado = "CONFIRMADA"
            projection.fecha_confirmacion = datetime.now()

            if has_column(proyeccion_cls, "id_transaccion_confirmada"):
                projection.id_transaccion_confirmada = transaction.id_transaccion

            if has_column(proyeccion_cls, "updated_at"):
                projection.updated_at = datetime.now()

            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return {"message": "No se pudo confirmar la proyección."}, 409

            return {
                "message": "Proyección confirmada correctamente.",
                "proyeccion": serialize_projection(
                    db=db,
                    projection=projection,
                    cuenta_cls=cuenta_cls,
                    categoria_cls=categoria_cls,
                ),
                "transaccion": serialize_model(transaction),
            }, 201

    @proyecciones_ns.route("/<int:id_proyeccion>/rechazar")
    @proyecciones_ns.doc(security="Bearer Auth")
    class RechazarProyeccionResource(Resource):
        @jwt_required
        def post(self, id_proyeccion):
            id_usuario = request.user.get("id_usuario")

            projection = get_projection_for_user(
                db=db,
                proyeccion_cls=proyeccion_cls,
                id_proyeccion=id_proyeccion,
                id_usuario=id_usuario,
            )

            if not projection:
                return {"message": "Proyección no encontrada."}, 404

            if projection.estado == "CONFIRMADA":
                return {"message": "No puedes rechazar una proyección confirmada."}, 400

            projection.estado = "RECHAZADA"

            if has_column(proyeccion_cls, "updated_at"):
                projection.updated_at = datetime.now()

            db.session.commit()

            return {"message": "Proyección rechazada correctamente."}, 200

    @proyecciones_ns.route("/<int:id_proyeccion>/reprogramar")
    @proyecciones_ns.doc(security="Bearer Auth")
    class ReprogramarProyeccionResource(Resource):
        @jwt_required
        def patch(self, id_proyeccion):
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            nueva_fecha, date_error = parse_date(
                data.get("fecha_programada"),
                "fecha_programada",
            )

            if date_error:
                return {"message": date_error}, 400

            if nueva_fecha < date.today():
                return {
                    "message": "La nueva fecha programada no puede ser anterior a la fecha actual."
                }, 400

            projection = get_projection_for_user(
                db=db,
                proyeccion_cls=proyeccion_cls,
                id_proyeccion=id_proyeccion,
                id_usuario=id_usuario,
            )

            if not projection:
                return {"message": "Proyección no encontrada."}, 404

            if projection.estado not in ["PENDIENTE", "REPROGRAMADA"]:
                return {
                    "message": "Solo puedes reprogramar proyecciones pendientes."
                }, 400

            projection.fecha_programada = nueva_fecha
            projection.estado = "REPROGRAMADA"

            if has_column(proyeccion_cls, "updated_at"):
                projection.updated_at = datetime.now()

            db.session.commit()

            return serialize_projection(
                db=db,
                projection=projection,
                cuenta_cls=cuenta_cls,
                categoria_cls=categoria_cls,
            ), 200