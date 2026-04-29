# FINORA 7 DE ABRIL/API/api.py

from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import class_mapper
from flask_restx import Api, Resource, fields
from flask_cors import CORS
import jwt
import datetime
from functools import wraps
import bcrypt

# --------------------------
# Configuración básica
# --------------------------
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+psycopg://postgres:postgre@127.0.0.1:5433/FinoraBD'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecreto_finora'

db = SQLAlchemy(app)
ma = Marshmallow(app)

CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
    expose_headers=["Content-Type", "Authorization"]
)

api = Api(
    app,
    doc='/swagger',
    title="Finora API",
    description="API RESTFUL con Swagger para Finora"
)

# --------------------------
# Reflejar tablas
# --------------------------
with app.app_context():
    Base = automap_base()
    Base.prepare(autoload_with=db.engine)
    tabla_clases = {cls.__table__.name: cls for cls in Base.classes}
    schemas = {}
    for nombre_tabla in tabla_clases.keys():
        schemas[nombre_tabla] = None
        schemas[f"{nombre_tabla}_list"] = None

# --------------------------
# Endpoint raíz funcional
# --------------------------
root_ns = api.namespace('root', description='Raíz de la API')

@root_ns.route('')
class Root(Resource):
    def get(self):
        return {
            "message": "API de Finora funcionando",
            "endpoints": list(tabla_clases.keys())
        }

# --------------------------
# Helpers Swagger / CRUD
# --------------------------
EXCLUDED_RESPONSE_FIELDS = {"password_hash"}
USUARIOS_TABLE_NAME = "usuarios"


def build_restx_field(col, readonly=False, required=False):
    """
    Mapea columnas SQLAlchemy reflejadas por automap a campos de Flask-RESTX.
    """
    kwargs = {
        "readonly": readonly,
        "required": required
    }

    col_type = str(col.type).upper()

    if col.primary_key:
        return fields.Integer(readonly=True)

    if col_type.startswith("INTEGER") or col_type.startswith("BIGINT") or col_type.startswith("SMALLINT"):
        return fields.Integer(**kwargs)
    elif col_type.startswith("NUMERIC") or col_type.startswith("DECIMAL") or col_type.startswith("FLOAT") or col_type.startswith("DOUBLE"):
        return fields.Float(**kwargs)
    elif col_type.startswith("BOOLEAN"):
        return fields.Boolean(**kwargs)
    elif col_type.startswith("DATE") or col_type.startswith("TIMESTAMP"):
        return fields.String(**kwargs)
    else:
        return fields.String(**kwargs)


def build_response_fields(clase):
    """
    Modelo de salida:
    - excluye password_hash siempre
    """
    response_fields = {}

    for col in clase.__table__.columns:
        if col.name in EXCLUDED_RESPONSE_FIELDS:
            continue

        response_fields[col.name] = build_restx_field(
            col,
            readonly=col.primary_key,
            required=False
        )

    return response_fields


def build_request_fields(clase, include_password=False, password_required=False):
    """
    Modelo de entrada:
    - excluye password_hash
    - opcionalmente agrega password para usuarios
    """
    request_fields = {}

    for col in clase.__table__.columns:
        if col.name in EXCLUDED_RESPONSE_FIELDS:
            continue

        # Normalmente no pedimos PK en entrada
        if col.primary_key:
            continue

        request_fields[col.name] = build_restx_field(
            col,
            readonly=False,
            required=False
        )

    if include_password:
        request_fields["password"] = fields.String(
            required=password_required,
            description="Contraseña en texto plano. Se almacenará hasheada."
        )

    return request_fields


def prepare_payload_for_create(nombre_tabla, data):
    """
    Prepara el payload antes de instanciar el objeto SQLAlchemy.
    Solo modifica la tabla usuarios.
    """
    payload = dict(data or {})

    # Nunca aceptar password_hash directo desde cliente
    payload.pop("password_hash", None)

    if nombre_tabla == USUARIOS_TABLE_NAME:
        raw_password = payload.pop("password", None)

        if not raw_password:
            api.abort(400, "El campo 'password' es obligatorio")

        hashed_password = bcrypt.hashpw(
            raw_password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        payload["password_hash"] = hashed_password

    return payload


def prepare_payload_for_update(nombre_tabla, data):
    """
    Prepara payload para PUT.
    No rompe otras tablas.
    En usuarios, si envían password, la convierte a password_hash.
    """
    payload = dict(data or {})

    # Nunca permitir actualización directa de password_hash desde cliente
    payload.pop("password_hash", None)

    if nombre_tabla == USUARIOS_TABLE_NAME and "password" in payload:
        raw_password = payload.pop("password")

        if raw_password:
            payload["password_hash"] = bcrypt.hashpw(
                raw_password.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

    return payload


# --------------------------
# Crear namespaces y modelos Swagger
# --------------------------
namespaces = {}
models = {}

for nombre_tabla, clase in tabla_clases.items():
    ns = api.namespace(nombre_tabla, description=f'CRUD para {nombre_tabla}')
    namespaces[nombre_tabla] = ns

    response_fields = build_response_fields(clase)

    # Modelo de salida
    response_model = ns.model(f"{nombre_tabla}_response", response_fields)

    # Modelo de entrada por defecto
    create_request_fields = build_request_fields(clase)
    update_request_fields = build_request_fields(clase)

    # Caso especial usuarios
    if nombre_tabla == USUARIOS_TABLE_NAME:
        create_request_fields = build_request_fields(
            clase,
            include_password=True,
            password_required=True
        )
        update_request_fields = build_request_fields(
            clase,
            include_password=True,
            password_required=False
        )

    create_model = ns.model(f"{nombre_tabla}_create", create_request_fields)
    update_model = ns.model(f"{nombre_tabla}_update", update_request_fields)

    models[nombre_tabla] = {
        "response": response_model,
        "create": create_model,
        "update": update_model
    }

# --------------------------
# Función para crear CRUD dinámico
# --------------------------
def crear_crud(ns, nombre_tabla, clase, schema, schema_list, swagger_models):
    pk_name = class_mapper(clase).primary_key[0].name
    response_model = swagger_models["response"]
    create_model = swagger_models["create"]
    update_model = swagger_models["update"]

    @ns.route('/')
    class Lista(Resource):
        @ns.marshal_list_with(response_model)
        def get(self):
            items = db.session.query(clase).all()
            return items

        @ns.expect(create_model, validate=True)
        @ns.marshal_with(response_model, code=201)
        def post(self):
            data = request.get_json() or {}
            payload = prepare_payload_for_create(nombre_tabla, data)

            nuevo = clase(**payload)
            db.session.add(nuevo)
            db.session.commit()

            return nuevo, 201

    @ns.route('/<int:item_id>')
    class Uno(Resource):
        @ns.marshal_with(response_model)
        def get(self, item_id):
            item = db.session.query(clase).filter_by(**{pk_name: item_id}).first()
            if not item:
                api.abort(404, f"{nombre_tabla} {item_id} no encontrado")
            return item

        @ns.expect(update_model, validate=True)
        @ns.marshal_with(response_model)
        def put(self, item_id):
            data = request.get_json() or {}
            item = db.session.query(clase).filter_by(**{pk_name: item_id}).first()

            if not item:
                api.abort(404, f"{nombre_tabla} {item_id} no encontrado")

            payload = prepare_payload_for_update(nombre_tabla, data)

            for k, v in payload.items():
                setattr(item, k, v)

            db.session.commit()
            return item

        def delete(self, item_id):
            item = db.session.query(clase).filter_by(**{pk_name: item_id}).first()
            if not item:
                api.abort(404, f"{nombre_tabla} {item_id} no encontrado")

            db.session.delete(item)
            db.session.commit()
            return '', 204


# --------------------------
# Generar CRUD para cada tabla
# --------------------------
for nombre_tabla, ns in namespaces.items():
    crear_crud(
        ns,
        nombre_tabla,
        tabla_clases[nombre_tabla],
        schemas[nombre_tabla],
        schemas[f"{nombre_tabla}_list"],
        models[nombre_tabla]
    )

# --------------------------
# Decorador para proteger rutas
# --------------------------
def jwt_required(f):
    @wraps(f)
    def decorator(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.replace('Bearer ', '')

        if not token:
            return {"message": "Token faltante"}, 401

        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return {"message": "Token expirado"}, 401
        except jwt.InvalidTokenError:
            return {"message": "Token inválido"}, 401

        return f(*args, **kwargs)

    return decorator


# --------------------------
# Decorador opcional para roles
# --------------------------
def roles_required(*roles_permitidos):
    def wrapper(f):
        @wraps(f)
        def decorator(*args, **kwargs):
            user_rol = request.user.get('rol')
            if user_rol not in roles_permitidos:
                return {"message": "Permiso denegado"}, 403
            return f(*args, **kwargs)
        return decorator
    return wrapper


# --------------------------
# Namespace auth
# --------------------------
auth_ns = api.namespace('auth', description='Autenticación de usuarios')

login_model = auth_ns.model('Login', {
    'correo': fields.String(required=True, description='Correo del usuario'),
    'password': fields.String(required=True, description='Contraseña')
})

register_model = auth_ns.model('Register', {
    'nombres': fields.String(required=True),
    'apellidos': fields.String(required=True),
    'correo': fields.String(required=True),
    'password': fields.String(required=True),
    'id_rol': fields.Integer(required=False)
})


@auth_ns.route('/login')
class Login(Resource):
    @auth_ns.expect(login_model)
    def post(self):
        data = request.get_json() or {}

        correo = data.get('correo')
        password = data.get('password')

        usuario_cls = tabla_clases['usuarios']
        usuario = db.session.query(usuario_cls).filter_by(correo=correo).first()

        if not usuario:
            return {"message": "Usuario no encontrado"}, 404

        if not bcrypt.checkpw(password.encode('utf-8'), usuario.password_hash.encode('utf-8')):
            return {"message": "Contraseña incorrecta"}, 401

        token_payload = {
            "id_usuario": usuario.id_usuario,
            "rol": usuario.id_rol,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }

        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")

        return {
            "token": token,
            "usuario": {
                "id_usuario": usuario.id_usuario,
                "id_rol": usuario.id_rol,
                "nombres": usuario.nombres,
                "apellidos": usuario.apellidos,
                "correo": usuario.correo,
                "estado": usuario.estado
            }
        }

@auth_ns.route('/register')
class Register(Resource):
    @auth_ns.expect(register_model)
    def post(self):
        data = request.get_json() or {}
        usuario_cls = tabla_clases['usuarios']

        if db.session.query(usuario_cls).filter_by(correo=data['correo']).first():
            return {"message": "Correo ya registrado"}, 400

        hashed = bcrypt.hashpw(
            data['password'].encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')

        nuevo_usuario = usuario_cls(
            nombres=data['nombres'],
            apellidos=data['apellidos'],
            correo=data['correo'],
            password_hash=hashed,
            id_rol=data.get('id_rol', 2)
        )

        db.session.add(nuevo_usuario)
        db.session.commit()

        return {"message": "Usuario registrado"}, 201


# --------------------------
# Ejecutar app
# --------------------------
if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)