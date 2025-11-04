"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask_cors import CORS
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Patient, Doctor, Appointment, Center
from api.utils import generate_sitemap, APIException
import bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
import requests

# API EXTERNA
DEFAULT_NAVARRA_URL = "https://v1itkby3i6.ufs.sh/f/0Z3x5lFQsHoMA5dMpr0oIsXfxg9jVSmyL65q4rtKROwEDU3G"

api = Blueprint('api', __name__)
CORS(api)

@api.route('/user', methods=['GET'])
def get_user():
    data = request.get_json()
    user = User.query.get()
    return jsonify({"id": user.id, "email": user.email}), 200


@api.route('/patients', methods=['GET'])
def get_all_patient():
    patients = Patient.all_patients()
    return jsonify([patient.serialize() for patient in patients]), 200


#############################################################################
#                           ROUTES OF CENTER                                #
#############################################################################




@api.route('/centers', methods=['GET'])
def get_centers():
    centers = Center.query.all()
    return jsonify([center.serialize() for center in centers]), 200

@api.route('/centers/seed/navarra', methods=['POST'])
def seed_navarra_centers():
    import json
    try:
        url = request.json.get("url") if request.is_json else None
        url = url or DEFAULT_NAVARRA_URL

        r = requests.get(url, stream=True)
        payload = json.loads(r.text[1:])

        # [id,"Codigo Centro","Nombre Centro","Domicilio","Localidad","Codigo Postal","Telefono","Tipo de Centro","Dependencia"]
        records = payload["records"]
        print(records)
        primeros_cinco = records[:5]

        created = []
        for row in primeros_cinco:
            name        = row[2]
            address     = row[3]
            zip_code    = row[5]
            phone       = row[6]
            type_center = row[7]

            # evita duplicados por (name,address)
            existing = Center.query.filter_by(
                name=name, address=address).first()
            if existing:
                continue

            c = Center.create(
                name=name,
                address=address,
                zip_code=zip_code,
                phone=phone,
                type_center=type_center
            )
            created.append(c.serialize())

        return jsonify({"inserted": len(created), "items": created}), 201

    except Exception as e:
        return jsonify({"message": f"Error al seedear centros: {str(e)}"}), 500


@api.route('/center_register', methods=['POST'])
def create_center():
    data = request.get_json()
    name = data.get("name")
    address = data.get("address")
    zip_code = data.get("zip_code")
    phone = data.get("phone")
    type_center = data.get("type_center")

    new_center = Center.create(
        name=name,
        address=address,
        zip_code=zip_code,
        phone=phone,
        type_center=type_center
    )
    return jsonify(new_center.serialize()), 201

#############################################################################
#                           ROUTES OF DOCTOR                                #
#############################################################################

@api.route('/doctors', methods=['GET'])
def get_all_doctors():
    doctors = Doctor.all_doctors()
    return jsonify([doctor.serialize() for doctor in doctors]), 200

@api.route("/login/doctor", methods=["POST"])
def create_token_doctor():
    data = request.json
    username = data["email"]
    password = data["password"]

    user = Doctor.query.filter_by(email=username).first()
    print(user.id)
    
    if not user or not bcrypt.checkpw(password.encode("utf-8"),user.password.encode("utf-8")):
        return jsonify({"msg": "Bad username or password"}), 401
     
    access_token = create_access_token(identity=str(user.id))
    return jsonify({"token": access_token, "user_id": user.id})



@api.route('/register/doctor', methods=['POST'])
def register_doctor():
    data = request.get_json()
    email = data.get("email")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    password = data.get("password")

    specialty = data.get("specialty")
    center_id = data.get("center_id")
    work_days = data.get("work_days")

    if not email or not password or not first_name or not last_name:
        response = jsonify({"msg": "email, password, nombre y apellido son requeridos."})
        return response, 400

    if Doctor.query.filter_by(email=email).first():
        response = jsonify({"msg": "This user already exists."})
        return response, 400

    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(
        password=password.encode("utf-8"), salt=salt)

    # Crear el nuevo doctor con valores falsos para los campos faltantes
    new_doctor = Doctor.create(email=email,
                    first_name=first_name,
                    last_name=last_name,
                    specialty=specialty,
                    center_id=center_id,
                    password=hashed_password.decode("utf-8"),
                    work_days=work_days,
                    )
    
    response = jsonify(new_doctor.serialize())
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response, 201


@api.route('/doctor/<int:doctor_id>', methods=['PUT'])
def update_doctor_details(doctor_id):

    # Buscamos al doctor
    doctor_to_update = Doctor.query.get(doctor_id)
    # Buscamos al doctor y verificamos que exista
    if not doctor_to_update:
        return jsonify({"error": "Paciente no encontrado"}), 404
    data = request.get_json()

    updates_to_make = {}

    # Si cambia la contraseña la hasheamos
    hashed_password = None
    if 'password' in data:
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(
            data['password'].encode('utf-8'), salt=salt)
        updates_to_make['password'] = hashed_password
    # Chequeamos si cambio el mail
    if 'email' in data:
        updates_to_make['email'] = data['email']
    # Chequeamos si cambio el doctor
    if 'work_days' in data:
        updates_to_make['work_days'] = data['work_days']
    if 'center_id' in data:
        updates_to_make['center_id'] = data['center_id']

    # Actualizamos el doctor
    doctor_to_update.update(**updates_to_make)
    # Devolvemos el doctor actualizado
    return jsonify(doctor_to_update.serialize()), 200


@api.route("/protected/doctor", methods=["GET"])
@jwt_required()
def protected_doctor():
    # Access the identity of the current user with get_jwt_identity
    current_user_id = int(get_jwt_identity())
    user = Doctor.query.get(current_user_id)
    return jsonify (user.serialize()), 200


#############################################################################
#                           ROUTES OF PATIENT                               #
#############################################################################


@api.route('/register/patient', methods=['POST'])
def register_patient():
    data = request.get_json()
    email = data.get("email")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    birth_date = data.get("birth_date")
    password = data.get("password")

    if not email or not password or not first_name or not last_name or not birth_date:
        response = jsonify({"msg": "Todos los campos principales (email, password, nombre, apellido, fecha) son requeridos."})
        return response, 400

    if Patient.query.filter_by(email=email).first():
        response = jsonify({"msg": "This user already exists."})
        return response, 400

    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(
        password=password.encode("utf-8"), salt=salt)

    new_patient = Patient.create(
        email=email,
        first_name=first_name,
        last_name=last_name,
        birth_date=birth_date,
        # phone_number=phone_number,
        password=hashed_password.decode("utf-8"),
        assign_doctor=data.get("assign_doctor", None)
    )
    response = jsonify(new_patient.serialize())

    # Solucion temporal CORS
    #response.headers.add("Access-Control-Allow-Origin", "*")

    return response, 201


@api.route("/login/patient", methods=["POST"])
def create_token_patient():
    data = request.json
    username = data["email"]
    password = data["password"]

    user = Patient.query.filter_by(email=username).first()

    if not user or not bcrypt.checkpw(password.encode("utf-8"),user.password.encode("utf-8")):
        return jsonify({"msg": "Bad username or password"}), 401
     
    access_token = create_access_token(identity=str(user.id))
    return jsonify({"token": access_token, "user_id": user.id})


@api.route('/patient/<int:patient_id>', methods=['PUT'])
def update_patient_details(patient_id):

    # Buscamos al paciente
    patient_to_update = Patient.query.get(patient_id)
    if not patient_to_update:
        return jsonify({"error": "Paciente no encontrado"}), 404
    data = request.get_json()

    # Creamos un diccionario con los cambios
    updates_to_make = {}

    # Si cambia la contraseña la hasheamos
    hashed_password = None
    if 'password' in data:
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(
            data['password'].encode('utf-8'), salt=salt)
        updates_to_make['password'] = hashed_password
    # Chequeamos si cambio el correo
    if 'email' in data:
        updates_to_make['email'] = data['email']
    # Chequeamos si cambio el doctor
    if 'assign_doctor' in data:
        updates_to_make['assign_doctor'] = data['assign_doctor']

    # Actualizamos el paciente
    patient_to_update.update(**updates_to_make)
    # Devolvemos el paciente actualizado
    return jsonify(patient_to_update.serialize()), 200


@api.route(('/patient/<int:patient_id>/inactive_patient'), methods=['PUT'])
def set_inactive(patient_id):

    # Buscamos al paciente y verificamos que existe
    patient_set_inactive = Patient.query.get(patient_id)
    if not patient_set_inactive:
        return jsonify({"error": "Paciente no encontrado"}), 404
    # Cambiamos su estado a inactivo
    patient_set_inactive.soft_delete()
    serialized_patient = patient_set_inactive.serialize()
    return serialized_patient

@api.route("/protected/patient", methods=["GET"])
@jwt_required()
def protected_patient():
    current_user_id = int(get_jwt_identity())
    patient = Patient.query.get(current_user_id)
    return jsonify (patient.serialize()), 200

@api.route('PatientDashboard/<int:patient_id>', methods=['GET'])
def dashboard_patient(patient_id):
    dash_patient = Patient.query.get(patient_id)
    if not dash_patient:
        return jsonify({"error": "Paciente no encontrado"}), 404

#############################################################################
#                           ROUTES OF APPOINTMENTS                          #
#############################################################################

@api.route('/patient/<int:patient_id>/appointments', methods=['GET']) 
@jwt_required()
def get_patient_appointments(patient_id):

    # 1. Buscamos todas las citas que coincidan con el patient_id
    # Usamos filter_by() para mayor robustez en la consulta
    appointments = Appointment.query.filter_by(patient_id=patient_id).all()

    # 2. Si no hay citas para ese paciente, appointments será una lista vacía [].
    # No es necesario buscar el paciente primero, ya que la lista vacía es un resultado válido.
    
    # 3. Serializamos la lista (usa appointment.serialize() si ya devuelve un dict)
    appointments_list = [appointment.serialize() for appointment in appointments]

    # 4. Devolvemos la lista, incluso si está vacía.
    return jsonify(appointments_list), 200

@api.route('/patient/<int:patient_id>/appointments', methods=['GET'])
@jwt_required
def get_patient_appointments(patient_id):

    # ¡ojo! aquí la función 'GET' se está haciendo pasar por 'PUT' o 'POST'
    # el GET solo debería buscar y devolver, no actualizar.

    # buscamos una cita para 'actualizar' (¡error!) en vez de buscar todas las citas del paciente
    update_appointment = Appointment.query.get(patient_id)
    if not update_appointment:
        # aquí fallará porque el 'patient_id' no es un 'appointment_id'
        return jsonify({"error": "cita no encontrada"}), 404

    # ¡error gordo! los GET no deberían tener cuerpo (body). esto peta el endpoint.
    data = request.get_json() 
    appointment_date = data.get('appointment_date')

    updates_to_make = {}

    # toda esta lógica es de 'update', no de 'get'. ¡cambio de rol!
    to_date = datetime.strptime(appointment_date, "%d-%m-%Y %H:%M")
    if 'appointment_date' in data:
        updates_to_make['appointment_date'] = to_date

    if 'status' in data:
        updates_to_make['status'] = data.get('status')

    # ¡otra vez actualizando! esto es lo que no deja que la ruta funcione bien en flask.
    update_appointment.update(**updates_to_make)

    # devolvemos la cita actualizada (pero la función se llama 'get', ¡qué lío!)
    return jsonify(update_appointment.serialize()), 200


@api.route('/appointment/<int:appointment_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_appointment(appointment_id):
    
    current_user_id = get_jwt_identity()

    # Buscamos la cita por ID
    cancelled_appointment = Appointment.query.get(appointment_id)
    if not cancelled_appointment:
        return jsonify({"msg": "Cita no encontrada"}), 404

    if cancelled_appointment.patient_id != current_user_id:
        # 403 Forbidden: El usuario está logueado pero no tiene permiso para modificar ESTE recurso
        return jsonify({"msg": "No tienes permiso para cancelar esta cita."}), 403 

    cancelled_appointment.cancel()
