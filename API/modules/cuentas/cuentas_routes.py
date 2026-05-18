from decimal import Decimal
from datetime import date, datetime

from flask import request
from flask_restx import Resource
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError


def serialize_model(instance):
    """
    Convierte una instancia reflejada por automap en un diccionario JSON-safe.
    Evita depender de Marshmallow para modelos dinámicos.
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


def clean_text(value):
    return str(value or "").strip()


def has_column(model_class, column_name):
    return column_name in model_class.__table__.columns


def get_allowed_account_type(db, tipo_cuenta_cls, id_tipo_cuenta, id_usuario):
    """
    Retorna un tipo de cuenta si es global o pertenece al usuario autenticado.
    """
    return (
        db.session.query(tipo_cuenta_cls)
        .filter(tipo_cuenta_cls.id_tipo_cuenta == id_tipo_cuenta)
        .filter(tipo_cuenta_cls.activa == True)
        .filter(
            or_(
                tipo_cuenta_cls.id_usuario == None,
                tipo_cuenta_cls.id_usuario == id_usuario,
            )
        )
        .first()
    )


def account_belongs_to_user(db, cuenta_cls, id_cuenta, id_usuario):
    return (
        db.session.query(cuenta_cls)
        .filter(cuenta_cls.id_cuenta == id_cuenta)
        .filter(cuenta_cls.id_usuario == id_usuario)
        .first()
    )


def register_cuentas_routes(api, db, tabla_clases, jwt_required):
    cuentas_ns = api.namespace(
        "finanzas/cuentas",
        path="/finanzas/cuentas",
        description="Operaciones de negocio para cuentas financieras",
    )

    cuenta_cls = get_table_class(tabla_clases, "cuentas")
    tipo_cuenta_cls = get_table_class(tabla_clases, "tipos_cuenta")

    @cuentas_ns.route("/")
    class CuentasResource(Resource):
        @jwt_required
        def get(self):
            """
            Lista las cuentas del usuario autenticado.
            Por defecto solo muestra cuentas activas.
            """
            id_usuario = request.user.get("id_usuario")
            include_inactive = request.args.get("include_inactive") == "true"

            query = (
                db.session.query(cuenta_cls)
                .filter(cuenta_cls.id_usuario == id_usuario)
                .order_by(cuenta_cls.id_cuenta.desc())
            )

            if not include_inactive:
                query = query.filter(cuenta_cls.activa == True)

            cuentas = query.all()

            return [serialize_model(cuenta) for cuenta in cuentas], 200

        @jwt_required
        def post(self):
            """
            Crea una cuenta para el usuario autenticado.
            No confía en id_usuario recibido desde frontend.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            nombre = clean_text(data.get("nombre"))
            id_tipo_cuenta = data.get("id_tipo_cuenta")
            saldo_inicial = data.get("saldo_inicial", 0)

            if not nombre:
                return {"message": "El nombre de la cuenta es obligatorio."}, 400

            if len(nombre) > 100:
                return {"message": "El nombre de la cuenta no puede superar 100 caracteres."}, 400

            if not id_tipo_cuenta:
                return {"message": "El tipo de cuenta es obligatorio."}, 400

            try:
                id_tipo_cuenta = int(id_tipo_cuenta)
            except (TypeError, ValueError):
                return {"message": "El tipo de cuenta no es válido."}, 400

            try:
                saldo_inicial = float(saldo_inicial)
            except (TypeError, ValueError):
                return {"message": "El saldo inicial debe ser numérico."}, 400

            if saldo_inicial < 0:
                return {"message": "El saldo inicial no puede ser negativo."}, 400

            tipo_cuenta = get_allowed_account_type(
                db=db,
                tipo_cuenta_cls=tipo_cuenta_cls,
                id_tipo_cuenta=id_tipo_cuenta,
                id_usuario=id_usuario,
            )

            if not tipo_cuenta:
                return {"message": "El tipo de cuenta no existe o no pertenece al usuario."}, 404

            payload = {
                "id_usuario": id_usuario,
                "nombre": nombre,
                "id_tipo_cuenta": id_tipo_cuenta,
                "saldo_inicial": saldo_inicial,
                "activa": True,
            }

            # Compatibilidad temporal si la columna antigua tipo_cuenta sigue existiendo.
            if has_column(cuenta_cls, "tipo_cuenta"):
                payload["tipo_cuenta"] = tipo_cuenta.nombre

            nueva_cuenta = cuenta_cls(**payload)

            db.session.add(nueva_cuenta)
            db.session.commit()

            return serialize_model(nueva_cuenta), 201

    @cuentas_ns.route("/<int:id_cuenta>")
    class CuentaResource(Resource):
        @jwt_required
        def get(self, id_cuenta):
            id_usuario = request.user.get("id_usuario")

            cuenta = account_belongs_to_user(
                db=db,
                cuenta_cls=cuenta_cls,
                id_cuenta=id_cuenta,
                id_usuario=id_usuario,
            )

            if not cuenta:
                return {"message": "Cuenta no encontrada."}, 404

            return serialize_model(cuenta), 200

        @jwt_required
        def put(self, id_cuenta):
            """
            Edita una cuenta del usuario autenticado.
            No permite cambiar id_usuario desde frontend.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            cuenta = account_belongs_to_user(
                db=db,
                cuenta_cls=cuenta_cls,
                id_cuenta=id_cuenta,
                id_usuario=id_usuario,
            )

            if not cuenta:
                return {"message": "Cuenta no encontrada."}, 404

            if "nombre" in data:
                nombre = clean_text(data.get("nombre"))

                if not nombre:
                    return {"message": "El nombre de la cuenta es obligatorio."}, 400

                if len(nombre) > 100:
                    return {"message": "El nombre de la cuenta no puede superar 100 caracteres."}, 400

                cuenta.nombre = nombre

            if "saldo_inicial" in data:
                try:
                    saldo_inicial = float(data.get("saldo_inicial"))
                except (TypeError, ValueError):
                    return {"message": "El saldo inicial debe ser numérico."}, 400

                if saldo_inicial < 0:
                    return {"message": "El saldo inicial no puede ser negativo."}, 400

                cuenta.saldo_inicial = saldo_inicial

            if "id_tipo_cuenta" in data:
                try:
                    id_tipo_cuenta = int(data.get("id_tipo_cuenta"))
                except (TypeError, ValueError):
                    return {"message": "El tipo de cuenta no es válido."}, 400

                tipo_cuenta = get_allowed_account_type(
                    db=db,
                    tipo_cuenta_cls=tipo_cuenta_cls,
                    id_tipo_cuenta=id_tipo_cuenta,
                    id_usuario=id_usuario,
                )

                if not tipo_cuenta:
                    return {"message": "El tipo de cuenta no existe o no pertenece al usuario."}, 404

                cuenta.id_tipo_cuenta = id_tipo_cuenta

                # Compatibilidad temporal con columna antigua.
                if has_column(cuenta_cls, "tipo_cuenta"):
                    cuenta.tipo_cuenta = tipo_cuenta.nombre

            if has_column(cuenta_cls, "updated_at"):
                cuenta.updated_at = datetime.now()

            db.session.commit()

            return serialize_model(cuenta), 200

        @jwt_required
        def delete(self, id_cuenta):
            """
            No elimina físicamente la cuenta.
            La desactiva para evitar borrar transacciones por cascada.
            """
            id_usuario = request.user.get("id_usuario")

            cuenta = account_belongs_to_user(
                db=db,
                cuenta_cls=cuenta_cls,
                id_cuenta=id_cuenta,
                id_usuario=id_usuario,
            )

            if not cuenta:
                return {"message": "Cuenta no encontrada."}, 404

            cuenta.activa = False

            if has_column(cuenta_cls, "updated_at"):
                cuenta.updated_at = datetime.now()

            db.session.commit()

            return {"message": "Cuenta desactivada correctamente."}, 200

    @cuentas_ns.route("/tipos")
    class TiposCuentaResource(Resource):
        @jwt_required
        def get(self):
            """
            Lista tipos globales y tipos personalizados del usuario.
            """
            id_usuario = request.user.get("id_usuario")
            include_inactive = request.args.get("include_inactive") == "true"

            query = (
                db.session.query(tipo_cuenta_cls)
                .filter(
                    or_(
                        tipo_cuenta_cls.id_usuario == None,
                        tipo_cuenta_cls.id_usuario == id_usuario,
                    )
                )
                .order_by(tipo_cuenta_cls.es_predeterminada.desc(), tipo_cuenta_cls.nombre.asc())
            )

            if not include_inactive:
                query = query.filter(tipo_cuenta_cls.activa == True)

            tipos = query.all()

            return [serialize_model(tipo) for tipo in tipos], 200

        @jwt_required
        def post(self):
            """
            Crea un tipo de cuenta personalizado para el usuario autenticado.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            nombre = clean_text(data.get("nombre"))
            descripcion = clean_text(data.get("descripcion"))

            if not nombre:
                return {"message": "El nombre del tipo de cuenta es obligatorio."}, 400

            if len(nombre) > 80:
                return {"message": "El nombre del tipo de cuenta no puede superar 80 caracteres."}, 400

            existing_type = (
                db.session.query(tipo_cuenta_cls)
                .filter(tipo_cuenta_cls.id_usuario == id_usuario)
                .filter(func.lower(tipo_cuenta_cls.nombre) == nombre.lower())
                .first()
            )

            if existing_type:
                return {"message": "Ya existe un tipo de cuenta con ese nombre."}, 409

            nuevo_tipo = tipo_cuenta_cls(
                id_usuario=id_usuario,
                nombre=nombre,
                descripcion=descripcion or None,
                activa=True,
                es_predeterminada=False,
            )

            db.session.add(nuevo_tipo)

            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return {"message": "No se pudo crear el tipo de cuenta. Verifica que no esté duplicado."}, 409

            return serialize_model(nuevo_tipo), 201

    @cuentas_ns.route("/tipos/<int:id_tipo_cuenta>")
    class TipoCuentaResource(Resource):
        @jwt_required
        def put(self, id_tipo_cuenta):
            """
            Edita únicamente tipos personalizados del usuario.
            No permite editar tipos predeterminados globales.
            """
            id_usuario = request.user.get("id_usuario")
            data = request.get_json(silent=True) or {}

            tipo = (
                db.session.query(tipo_cuenta_cls)
                .filter(tipo_cuenta_cls.id_tipo_cuenta == id_tipo_cuenta)
                .filter(tipo_cuenta_cls.id_usuario == id_usuario)
                .first()
            )

            if not tipo:
                return {"message": "Tipo de cuenta no encontrado o no editable."}, 404

            if getattr(tipo, "es_predeterminada", False):
                return {"message": "No se pueden editar tipos de cuenta predeterminados."}, 403

            if "nombre" in data:
                nombre = clean_text(data.get("nombre"))

                if not nombre:
                    return {"message": "El nombre del tipo de cuenta es obligatorio."}, 400

                if len(nombre) > 80:
                    return {"message": "El nombre del tipo de cuenta no puede superar 80 caracteres."}, 400

                duplicate = (
                    db.session.query(tipo_cuenta_cls)
                    .filter(tipo_cuenta_cls.id_usuario == id_usuario)
                    .filter(func.lower(tipo_cuenta_cls.nombre) == nombre.lower())
                    .filter(tipo_cuenta_cls.id_tipo_cuenta != id_tipo_cuenta)
                    .first()
                )

                if duplicate:
                    return {"message": "Ya existe otro tipo de cuenta con ese nombre."}, 409

                tipo.nombre = nombre

            if "descripcion" in data:
                tipo.descripcion = clean_text(data.get("descripcion")) or None

            if has_column(tipo_cuenta_cls, "updated_at"):
                tipo.updated_at = datetime.now()

            db.session.commit()

            return serialize_model(tipo), 200

        @jwt_required
        def delete(self, id_tipo_cuenta):
            """
            Desactiva tipos personalizados.
            No borra ni desactiva tipos globales predeterminados.
            """
            id_usuario = request.user.get("id_usuario")

            tipo = (
                db.session.query(tipo_cuenta_cls)
                .filter(tipo_cuenta_cls.id_tipo_cuenta == id_tipo_cuenta)
                .filter(tipo_cuenta_cls.id_usuario == id_usuario)
                .first()
            )

            if not tipo:
                return {"message": "Tipo de cuenta no encontrado o no editable."}, 404

            if getattr(tipo, "es_predeterminada", False):
                return {"message": "No se pueden desactivar tipos de cuenta predeterminados."}, 403

            tipo.activa = False

            if has_column(tipo_cuenta_cls, "updated_at"):
                tipo.updated_at = datetime.now()

            db.session.commit()

            return {"message": "Tipo de cuenta desactivado correctamente."}, 200
        
        @cuentas_ns.route("/<int:id_cuenta>/activar")
        @cuentas_ns.doc(security="Bearer Auth")
        class ActivarCuentaResource(Resource):
            @jwt_required
            def patch(self, id_cuenta):
                id_usuario = request.user.get("id_usuario")

                cuenta = account_belongs_to_user(
                    db=db,
                    cuenta_cls=cuenta_cls,
                    id_cuenta=id_cuenta,
                    id_usuario=id_usuario,
                )

                if not cuenta:
                    return {"message": "Cuenta no encontrada."}, 404

                cuenta.activa = True

                if has_column(cuenta_cls, "updated_at"):
                    cuenta.updated_at = datetime.now()

                db.session.commit()

                return {"message": "Cuenta activada correctamente."}, 200