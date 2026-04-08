from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import class_mapper
from flask_restx import Api, Resource, fields
from flask_cors import CORS

# --------------------------
# Configuración básica
# --------------------------
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+psycopg://postgres:postgre@127.0.0.1:5433/FinoraBD'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecreto_finora'

db = SQLAlchemy(app)
ma = Marshmallow(app)

# Aplicar CORS correctamente
CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
    expose_headers=["Content-Type", "Authorization"]
)

api = Api(app, doc='/swagger', title="Finora API", description="API RESTFUL con Swagger para Finora")

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
# Crear namespaces y modelos Swagger
# --------------------------
namespaces = {}
models = {}

for nombre_tabla, clase in tabla_clases.items():
    ns = api.namespace(nombre_tabla, description=f'CRUD para {nombre_tabla}')
    namespaces[nombre_tabla] = ns

    columnas = {}
    for col in clase.__table__.columns:
        if col.name == "password_hash":
            continue  # Ocultar password en Swagger
        if col.primary_key:
            columnas[col.name] = fields.Integer(readonly=True)
        elif str(col.type).startswith("VARCHAR") or str(col.type).startswith("TEXT"):
            columnas[col.name] = fields.String
        elif str(col.type).startswith("NUMERIC") or str(col.type).startswith("DECIMAL"):
            columnas[col.name] = fields.Float
        elif str(col.type).startswith("BOOLEAN"):
            columnas[col.name] = fields.Boolean
        elif str(col.type).startswith("DATE") or str(col.type).startswith("TIMESTAMP"):
            columnas[col.name] = fields.String
        else:
            columnas[col.name] = fields.String
    models[nombre_tabla] = ns.model(nombre_tabla, columnas)

# --------------------------
# Función para crear CRUD dinámico
# --------------------------
def crear_crud(ns, nombre_tabla, clase, schema, schema_list, model_swagger):
    pk_name = class_mapper(clase).primary_key[0].name

    @ns.route('/')
    class Lista(Resource):
        @ns.marshal_list_with(model_swagger)
        def get(self):
            items = db.session.query(clase).all()
            if nombre_tabla == "usuarios":
                for item in items:
                    if hasattr(item, "password_hash"):
                        item.password_hash = None
            return items

        @ns.expect(model_swagger)
        @ns.marshal_with(model_swagger, code=201)
        def post(self):
            data = request.json
            nuevo = clase(**data)
            db.session.add(nuevo)
            db.session.commit()
            if nombre_tabla == "usuarios" and hasattr(nuevo, "password_hash"):
                nuevo.password_hash = None
            return nuevo, 201

    @ns.route('/<int:item_id>')
    class Uno(Resource):
        @ns.marshal_with(model_swagger)
        def get(self, item_id):
            item = db.session.query(clase).filter_by(**{pk_name: item_id}).first()
            if not item:
                api.abort(404, f"{nombre_tabla} {item_id} no encontrado")
            if nombre_tabla == "usuarios" and hasattr(item, "password_hash"):
                item.password_hash = None
            return item

        @ns.expect(model_swagger)
        @ns.marshal_with(model_swagger)
        def put(self, item_id):
            data = request.json
            item = db.session.query(clase).filter_by(**{pk_name: item_id}).first()
            if not item:
                api.abort(404, f"{nombre_tabla} {item_id} no encontrado")
            for k, v in data.items():
                setattr(item, k, v)
            db.session.commit()
            if nombre_tabla == "usuarios" and hasattr(item, "password_hash"):
                item.password_hash = None
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
    crear_crud(ns, nombre_tabla, tabla_clases[nombre_tabla],
                schemas[nombre_tabla],
                schemas[f"{nombre_tabla}_list"],
                models[nombre_tabla])
    
import jwt
import datetime
from functools import wraps
import bcrypt

# --------------------------
# Configuración JWT
# --------------------------
app.config['SECRET_KEY'] = 'supersecreto_finora'  # Cambiar a variable de entorno

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
            request.user = payload  # guardar info del usuario en request
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

    @auth_ns.expect(login_model)  # 🔥 ESTO ARREGLA SWAGGER
    def post(self):
        data = request.json
        print("JSON recibido:", data)  # debug opcional

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

        return {"token": token}

@auth_ns.route('/register')
class Register(Resource):
    @auth_ns.expect(register_model)
    def post(self):
        data = request.json
        usuario_cls = tabla_clases['usuarios']

        if db.session.query(usuario_cls).filter_by(correo=data['correo']).first():
            return {"message": "Correo ya registrado"}, 400

        hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        nuevo_usuario = usuario_cls(
            nombres=data['nombres'],
            apellidos=data['apellidos'],
            correo=data['correo'],
            password_hash=hashed,
            id_rol=data.get('id_rol', 1)  # 1 = rol básico por defecto
        )
        db.session.add(nuevo_usuario)
        db.session.commit()
        return {"message": "Usuario registrado"}, 201
    

# --------------------------
# Ejecutar app
# --------------------------
if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)