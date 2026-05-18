from decimal import Decimal
from datetime import date, datetime

from flask import request
from flask_restx import Resource
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError


GOAL_CONTRIBUTION_CATEGORY_NAME = "Aporte a meta"


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


def parse_optional_date(value, field_name):
    if not value:
        return None, None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date(), None
    except (TypeError, ValueError):
        return None, f"El campo '{field_name}' debe tener formato YYYY-MM-DD."


def get_goal_for_user(db, meta_cls, id_meta, id_usuario):
    return (
        db.session.query(meta_cls)
        .filter(meta_cls.id_meta == id_meta)
        .filter(meta_cls.id_usuario == id_usuario)
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


def get_or_create_goal_contribution_category(db, categoria_cls, id_usuario):
    """
    Busca una categoría de gasto para aportes a metas.
    Si no existe para el usuario, la crea.

    Se crea por usuario para evitar depender de datos globales y mantener
    el módulo autocontenido.
    """
    category = (
        db.session.query(categoria_cls)
        .filter(categoria_cls.id_usuario == id_usuario)
        .filter(func.lower(categoria_cls.nombre) == GOAL_CONTRIBUTION_CATEGORY_NAME.lower())
        .filter(categoria_cls.tipo_movimiento == "GASTO")
        .first()
    )

    if category:
        if not category.activa:
            category.activa = True
        return category

    category = categoria_cls(
        id_usuario=id_usuario,
        nombre=GOAL_CONTRIBUTION_CATEGORY_NAME,
        tipo_movimiento="GASTO",
        descripcion="Movimiento generado al aportar dinero a una meta financiera.",
        activa=True,
    )

    db.session.add(category)
    db.session.flush()

    return category


def calculate_goal_saved_amount(db, aporte_cls, id_meta):
    total = (
        db.session.query(func.coalesce(func.sum(aporte_cls.monto), 0))
        .filter(aporte_cls.id_meta == id_meta)
        .scalar()
    )

    return float(total or 0)


def calculate_goal_progress(goal, saved_amount):
    target = float(getattr(goal, "monto_objetivo", 0) or 0)

    if target <= 0:
        return 0

    progress = (saved_amount / target) * 100

    return min(round(progress, 2), 100)


def serialize_goal_with_progress(db, goal, aporte_cls):
    saved_amount = calculate_goal_saved_amount(
        db=db,
        aporte_cls=aporte_cls,
        id_meta=goal.id_meta,
    )

    data = serialize_model(goal)
    data["monto_ahorrado"] = saved_amount
    data["porcentaje_cumplimiento"] = calculate_goal_progress(goal, saved_amount)
    data["monto_restante"] = max(float(goal.monto_objetivo or 0) - saved_amount, 0)

    return data


def calculate_account_balance(db, cuenta, transaccion_cls, categoria_cls):
    """
    Calcula saldo actual de una cuenta:
    saldo_inicial + ingresos - gastos.
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


def register_metas_routes(api, db, tabla_clases, jwt_required):
    metas_ns = api.namespace(
        "finanzas/metas",
        path="/finanzas/metas",
        description="Operaciones de negocio para metas financieras",
    )

    meta_cls = get_table_class(tabla_clases, "metas_financieras")
    aporte_cls = get_table_class(tabla_clases, "aportes_meta")
    cuenta_cls = get_table_class(tabla_clases, "cuentas")
    categoria_cls = get_table_class(tabla_clases, "categorias")
    transaccion_cls = get_table_class(tabla_clases, "transacciones")

    @metas_ns.route("/")
    @metas_ns.doc(security="Bearer Auth")
    class MetasResource(Resource):
        @jwt_required
        def get(self):
            """
            Lista metas del usuario autenticado.
            Por defecto no incluye metas canceladas.
            """
            id_usuario = request.user.get("id_usuario")
            include_inactive = request.args.get("include_inactive") == "true"

            query = (
                db.session.query(meta_cls)
                .filter(meta_cls.id_usuario == id_usuario)
                .order_by(meta_cls.id_meta.desc())
            )

            if not include_inactive:
                query = query.filter(meta_cls.estado != "CANCELADA")

            goals = query.all()

            return [
                serialize_goal_with_progress(db, goal, aporte_cls)
                for goal in goals
            ], 200

        @jwt_required
        def post(self):
            """
            Crea una meta financiera para el usuario autenticado.
            No confía en id_usuario enviado desde frontend.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            nombre = clean_text(data.get("nombre"))
            descripcion = clean_text(data.get("descripcion"))
            monto_objetivo, amount_error = parse_positive_amount(
                data.get("monto_objetivo"),
                "monto_objetivo",
            )
            fecha_inicio, fecha_inicio_error = parse_optional_date(
                data.get("fecha_inicio"),
                "fecha_inicio",
            )
            fecha_limite, fecha_limite_error = parse_optional_date(
                data.get("fecha_limite"),
                "fecha_limite",
            )

            if not nombre:
                return {"message": "El nombre de la meta es obligatorio."}, 400

            if len(nombre) > 120:
                return {"message": "El nombre de la meta no puede superar 120 caracteres."}, 400

            if amount_error:
                return {"message": amount_error}, 400

            if fecha_inicio_error:
                return {"message": fecha_inicio_error}, 400

            if fecha_limite_error:
                return {"message": fecha_limite_error}, 400

            if fecha_inicio and fecha_limite and fecha_limite < fecha_inicio:
                return {"message": "La fecha límite no puede ser menor a la fecha de inicio."}, 400

            payload = {
                "id_usuario": id_usuario,
                "nombre": nombre,
                "descripcion": descripcion or None,
                "monto_objetivo": monto_objetivo,
                "estado": "ACTIVA",
            }

            if fecha_inicio:
                payload["fecha_inicio"] = fecha_inicio

            if fecha_limite:
                payload["fecha_limite"] = fecha_limite

            goal = meta_cls(**payload)

            db.session.add(goal)
            db.session.commit()

            return serialize_goal_with_progress(db, goal, aporte_cls), 201

    @metas_ns.route("/<int:id_meta>")
    @metas_ns.doc(security="Bearer Auth")
    class MetaResource(Resource):
        @jwt_required
        def get(self, id_meta):
            id_usuario = request.user.get("id_usuario")

            goal = get_goal_for_user(
                db=db,
                meta_cls=meta_cls,
                id_meta=id_meta,
                id_usuario=id_usuario,
            )

            if not goal:
                return {"message": "Meta no encontrada."}, 404

            return serialize_goal_with_progress(db, goal, aporte_cls), 200

        @jwt_required
        def put(self, id_meta):
            """
            Edita una meta del usuario autenticado.
            No permite cambiar id_usuario desde frontend.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            goal = get_goal_for_user(
                db=db,
                meta_cls=meta_cls,
                id_meta=id_meta,
                id_usuario=id_usuario,
            )

            if not goal:
                return {"message": "Meta no encontrada."}, 404

            if goal.estado == "CANCELADA":
                return {"message": "No puedes editar una meta cancelada."}, 400

            if "nombre" in data:
                nombre = clean_text(data.get("nombre"))

                if not nombre:
                    return {"message": "El nombre de la meta es obligatorio."}, 400

                if len(nombre) > 120:
                    return {"message": "El nombre de la meta no puede superar 120 caracteres."}, 400

                goal.nombre = nombre

            if "descripcion" in data:
                goal.descripcion = clean_text(data.get("descripcion")) or None

            if "monto_objetivo" in data:
                monto_objetivo, amount_error = parse_positive_amount(
                    data.get("monto_objetivo"),
                    "monto_objetivo",
                )

                if amount_error:
                    return {"message": amount_error}, 400

                saved_amount = calculate_goal_saved_amount(
                    db=db,
                    aporte_cls=aporte_cls,
                    id_meta=id_meta,
                )

                if monto_objetivo < saved_amount:
                    return {
                        "message": (
                            "El monto objetivo no puede ser menor al dinero "
                            "ya aportado a la meta."
                        )
                    }, 400

                goal.monto_objetivo = monto_objetivo

            if "fecha_inicio" in data:
                fecha_inicio, fecha_inicio_error = parse_optional_date(
                    data.get("fecha_inicio"),
                    "fecha_inicio",
                )

                if fecha_inicio_error:
                    return {"message": fecha_inicio_error}, 400

                if fecha_inicio:
                    goal.fecha_inicio = fecha_inicio

            if "fecha_limite" in data:
                fecha_limite, fecha_limite_error = parse_optional_date(
                    data.get("fecha_limite"),
                    "fecha_limite",
                )

                if fecha_limite_error:
                    return {"message": fecha_limite_error}, 400

                goal.fecha_limite = fecha_limite

            if goal.fecha_limite and goal.fecha_inicio and goal.fecha_limite < goal.fecha_inicio:
                return {"message": "La fecha límite no puede ser menor a la fecha de inicio."}, 400

            if has_column(meta_cls, "updated_at"):
                goal.updated_at = datetime.now()

            db.session.commit()

            return serialize_goal_with_progress(db, goal, aporte_cls), 200

        @jwt_required
        def delete(self, id_meta):
            """
            Cancela la meta. No borra aportes ni transacciones.
            """
            id_usuario = request.user.get("id_usuario")

            goal = get_goal_for_user(
                db=db,
                meta_cls=meta_cls,
                id_meta=id_meta,
                id_usuario=id_usuario,
            )

            if not goal:
                return {"message": "Meta no encontrada."}, 404

            goal.estado = "CANCELADA"

            if has_column(meta_cls, "updated_at"):
                goal.updated_at = datetime.now()

            db.session.commit()

            return {"message": "Meta cancelada correctamente."}, 200

    @metas_ns.route("/<int:id_meta>/activar")
    @metas_ns.doc(security="Bearer Auth")
    class ActivarMetaResource(Resource):
        @jwt_required
        def patch(self, id_meta):
            id_usuario = request.user.get("id_usuario")

            goal = get_goal_for_user(
                db=db,
                meta_cls=meta_cls,
                id_meta=id_meta,
                id_usuario=id_usuario,
            )

            if not goal:
                return {"message": "Meta no encontrada."}, 404

            saved_amount = calculate_goal_saved_amount(
                db=db,
                aporte_cls=aporte_cls,
                id_meta=id_meta,
            )

            if saved_amount >= float(goal.monto_objetivo or 0):
                goal.estado = "CUMPLIDA"
            else:
                goal.estado = "ACTIVA"

            if has_column(meta_cls, "updated_at"):
                goal.updated_at = datetime.now()

            db.session.commit()

            return serialize_goal_with_progress(db, goal, aporte_cls), 200

    @metas_ns.route("/<int:id_meta>/aportes")
    @metas_ns.doc(security="Bearer Auth")
    class AportesMetaResource(Resource):
        @jwt_required
        def get(self, id_meta):
            id_usuario = request.user.get("id_usuario")

            goal = get_goal_for_user(
                db=db,
                meta_cls=meta_cls,
                id_meta=id_meta,
                id_usuario=id_usuario,
            )

            if not goal:
                return {"message": "Meta no encontrada."}, 404

            aportes = (
                db.session.query(aporte_cls)
                .filter(aporte_cls.id_meta == id_meta)
                .order_by(aporte_cls.id_aporte.desc())
                .all()
            )

            return [serialize_model(aporte) for aporte in aportes], 200

    @metas_ns.route("/<int:id_meta>/aportar")
    @metas_ns.doc(security="Bearer Auth")
    class AportarMetaResource(Resource):
        @jwt_required
        def post(self, id_meta):
            """
            Aporta dinero a una meta:
            - valida que la meta pertenezca al usuario;
            - valida cuenta activa y saldo suficiente;
            - crea una transacción de gasto;
            - crea un aporte_meta asociado a esa transacción.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            id_cuenta = data.get("id_cuenta")
            monto, amount_error = parse_positive_amount(data.get("monto"), "monto")
            descripcion = clean_text(data.get("descripcion"))

            if amount_error:
                return {"message": amount_error}, 400

            try:
                id_cuenta = int(id_cuenta)
            except (TypeError, ValueError):
                return {"message": "La cuenta seleccionada no es válida."}, 400

            goal = get_goal_for_user(
                db=db,
                meta_cls=meta_cls,
                id_meta=id_meta,
                id_usuario=id_usuario,
            )

            if not goal:
                return {"message": "Meta no encontrada."}, 404

            if goal.estado != "ACTIVA":
                return {"message": "Solo puedes aportar a metas activas."}, 400

            saved_amount = calculate_goal_saved_amount(
                db=db,
                aporte_cls=aporte_cls,
                id_meta=id_meta,
            )

            remaining_amount = float(goal.monto_objetivo or 0) - saved_amount

            if remaining_amount <= 0:
                goal.estado = "CUMPLIDA"

                if has_column(meta_cls, "updated_at"):
                    goal.updated_at = datetime.now()

                db.session.commit()

                return {"message": "La meta ya está cumplida."}, 400

            if monto > remaining_amount:
                return {
                    "message": (
                        "El aporte supera el monto restante de la meta. "
                        f"Monto restante: {remaining_amount:.2f}."
                    )
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
                return {"message": "No puedes aportar desde una cuenta inactiva."}, 400

            account_balance = calculate_account_balance(
                db=db,
                cuenta=account,
                transaccion_cls=transaccion_cls,
                categoria_cls=categoria_cls,
            )

            if monto > account_balance:
                return {
                    "message": (
                        "La cuenta seleccionada no tiene saldo suficiente. "
                        f"Saldo disponible: {account_balance:.2f}."
                    )
                }, 400

            contribution_category = get_or_create_goal_contribution_category(
                db=db,
                categoria_cls=categoria_cls,
                id_usuario=id_usuario,
            )

            transaction_description = (
                descripcion
                or f"Aporte a meta: {goal.nombre}"
            )

            transaction = transaccion_cls(
                id_cuenta=id_cuenta,
                id_categoria=contribution_category.id_categoria,
                monto=monto,
                fecha_movimiento=date.today(),
                descripcion=transaction_description,
            )

            db.session.add(transaction)
            db.session.flush()

            contribution = aporte_cls(
                id_meta=id_meta,
                id_transaccion=transaction.id_transaccion,
                monto=monto,
            )

            db.session.add(contribution)

            new_saved_amount = saved_amount + monto

            if new_saved_amount >= float(goal.monto_objetivo or 0):
                goal.estado = "CUMPLIDA"

            if has_column(meta_cls, "updated_at"):
                goal.updated_at = datetime.now()

            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return {
                    "message": "No se pudo registrar el aporte a la meta."
                }, 409

            return {
                "message": "Aporte registrado correctamente.",
                "meta": serialize_goal_with_progress(db, goal, aporte_cls),
                "aporte": serialize_model(contribution),
                "transaccion": serialize_model(transaction),
            }, 201