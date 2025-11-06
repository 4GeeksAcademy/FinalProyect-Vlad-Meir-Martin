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
            name = row[2]
            address = row[3]
            zip_code = row[5]
            phone = row[6]
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

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
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
        response = jsonify(
            {"msg": "email, password, nombre y apellido son requeridos."})
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
    return jsonify(user.serialize()), 200

# api/routes.py (Añadir este código)


@api.route("/doctor/appointments", methods=["GET"])
@jwt_required()
def get_doctor_appointments():
    # 1. Obtener el ID del doctor desde el token JWT
    current_user_id = int(get_jwt_identity())

    # 2. Buscar todas las citas donde el doctor_id coincida
    # Usamos .all() para obtener una lista de objetos Appointment
    appointments = Appointment.query.filter_by(doctor_id=current_user_id).all()

    # 3. Serializar la lista de citas
    # También necesitamos el nombre del paciente para el frontend
    serialized_appointments = []
    for app in appointments:
        # Obtenemos el paciente para obtener su nombre
        patient = Patient.query.get(app.patient_id)

        # Creamos un objeto de cita más completo para el frontend
        serialized_app = app.serialize()

        # Formateamos la fecha y hora para que el frontend la entienda
        # El frontend espera 'DD/MM/YYYY' y 'HH:MM'
        appointment_dt = app.appointment_date
        date_key = appointment_dt.strftime("%d/%m/%Y")
        time_key = appointment_dt.strftime("%H:%M")

        serialized_appointments.append({
            "id": serialized_app["id"],
            "dateKey": date_key,
            "time": time_key,
            # Nombre completo del paciente
            "patient": f"{patient.first_name} {patient.last_name}",
            # Puedes añadir un campo 'reason' al modelo Appointment si lo necesitas
            "reason": "Consulta médica",
            "status": serialized_app["status"],
            "center_id": serialized_app["center_id"],
            "doctor_id": serialized_app["doctor_id"],
            "patient_id": serialized_app["patient_id"],
        })

    return jsonify(serialized_appointments), 200


@api.route('/doctor/center', methods=['PUT'])
@jwt_required()
def update_doctor_center():
    # 1. Obtener la identidad del doctor desde el token JWT
    current_user_id = int(get_jwt_identity())
    doctor = Doctor.query.get(current_user_id)

    if not doctor:
        return jsonify({"msg": "Doctor no encontrado o token inválido"}), 404

    # 2. Obtener el center_id del cuerpo de la solicitud
    data = request.get_json()
    if not data or 'center_id' not in data:
        return jsonify({"msg": "El campo 'center_id' es requerido"}), 400

    center_id = data.get('center_id')

    # 3. Verificar que el centro existe
    center = Center.query.get(center_id)
    if not center:
        return jsonify({"msg": "El centro especificado no existe"}), 404

    # 4. Actualizar el centro del doctor usando la función del modelo
    try:
        doctor.update(center_id=center_id)
        return jsonify(doctor.serialize()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error al actualizar el centro: {str(e)}"}), 500

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
        response = jsonify(
            {"msg": "Todos los campos principales (email, password, nombre, apellido, fecha) son requeridos."})
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
    # response.headers.add("Access-Control-Allow-Origin", "*")

    return response, 201


@api.route("/login/patient", methods=["POST"])
def create_token_patient():
    data = request.json
    username = data["email"]
    password = data["password"]

    user = Patient.query.filter_by(email=username).first()

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
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
    return jsonify(patient.serialize()), 200


@api.route('PatientDashboard/<int:patient_id>', methods=['GET'])
def dashboard_patient(patient_id):
    dash_patient = Patient.query.get(patient_id)
    if not dash_patient:
        return jsonify({"error": "Paciente no encontrado"}), 404

#############################################################################
#                           ROUTES OF APPOINTMENTS                          #
#############################################################################


@api.route('/appointment', methods=['POST'])
def create_appointment():
    data = request.get_json()
    doctor_id = data.get("doctor_id")
    patient_id = data.get("patient_id")  # <-- Añadido
    center_id = data.get("center_id")
    appointment_date = data.get("appointment_date")

    # Validamos que los campos requeridos no esten vacios
    if not doctor_id or not patient_id or not appointment_date or not center_id:
        return jsonify({
            "msg": "doctor_id, patient_id, center_id y appointment_date son requeridos para pedir cita"
        }), 400

    try:
        # Pasamos el String del JSON a formato Date
        # Formato esperado: DD-MM-YYYY HH:MM (ej: 06-11-2025 18:30)
        appointment_dt = datetime.strptime(appointment_date, "%d-%m-%Y %H:%M")
    except ValueError:
        return jsonify({
            "msg": "Formato de fecha inválido. Se espera DD-MM-YYYY HH:MM"
        }), 400

    # Opcional: Verificar que el doctor, paciente y centro existan antes de crear la cita
    if not Doctor.query.get(doctor_id):
        return jsonify({"msg": "Doctor no encontrado"}), 404
    if not Patient.query.get(patient_id):
        return jsonify({"msg": "Paciente no encontrado"}), 404
    if not Center.query.get(center_id):
        return jsonify({"msg": "Centro no encontrado"}), 404

    try:
        new_appointment = Appointment.create(
            doctor_id=doctor_id,
            patient_id=patient_id,
            center_id=center_id,
            appointment_date=appointment_dt,
        )
        return jsonify(new_appointment.serialize()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error interno al crear la cita: {str(e)}"}), 500


@api.route('/appointment/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):

    # Buscamos la cita
    update_appointment = Appointment.query.get(appointment_id)
    if not update_appointment:
        return jsonify({"error": "Cita no encontrada"}), 404
    data = request.get_json()
    appointment_date = data.get('appointment_date')

    updates_to_make = {}

    to_date = datetime.strptime(appointment_date, "%d-%m-%Y %H:%M")
    if 'appointment_date' in data:
        updates_to_make['appointment_date'] = to_date

    if 'status' in data:
        updates_to_make['status'] = data.get('status')

    # Actualizamos la cita
    update_appointment.update(**updates_to_make)

    # Devolvemos la cita actualizada
    return jsonify(update_appointment.serialize()), 200


@api.route('/appointment/<int:appointment_id>/cancel', methods=['PUT'])
def cancel_appointment(appointment_id):

    # Buscamos al paciente y verificamos que existe
    cancelled_appointment = Appointment.query.get(appointment_id)
    if not cancelled_appointment:
        return jsonify({"error": "Cita no encontrada"}), 404

    # Cambiamos su estado a inactivo
    cancelled_appointment.cancel()
    serialized_appointment = cancelled_appointment.serialize()
    return serialized_appointment
