const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

/**
 * Envía un email de notificación sobre cambio de estado de una oferta de trabajo
 * @param {string} email - Email del destinatario
 * @param {string} userName - Nombre del usuario
 * @param {object} offer - Datos de la oferta
 * @param {string} status - Nuevo estado de la oferta (accepted, rejected, cancelled)
 */
const sendJobOfferStatusNotification = async (email, userName, offer, status) => {
    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
    const sender = { email: "jaumefernandezsunyer12@gmail.com", name: "Study" };
    const receivers = [{ email }];

    let subject = '';
    let content = '';

    switch (status) {
        case 'accepted':
            subject = '¡Tu oferta de trabajo ha sido aceptada!';
            content = `
                <h2>¡Enhorabuena ${userName}!</h2>
                <p>Nos complace informarte que tu oferta de trabajo <strong>${offer.position}</strong> ha sido revisada y aceptada.</p>
                <p>Ya está publicada en nuestra plataforma y los usuarios pueden verla y aplicar a ella.</p>
                <p>Detalles de la oferta:</p>
                <ul>
                    <li><strong>Posición:</strong> ${offer.position}</li>
                    <li><strong>Empresa:</strong> ${offer.company}</li>
                    <li><strong>Ubicación:</strong> ${offer.location}</li>
                </ul>
                <p>Puedes acceder a tu panel de control para ver las aplicaciones y gestionar tu oferta.</p>
                <p>¡Gracias por confiar en nuestra plataforma!</p>
            `;
            break;
        case 'rejected':
        case 'cancelled':
            subject = 'Actualización sobre tu oferta de trabajo';
            content = `
                <h2>Hola ${userName}</h2>
                <p>Lamentamos informarte que tu oferta de trabajo <strong>${offer.position}</strong> ha sido ${status === 'rejected' ? 'rechazada' : 'cancelada'}.</p>
                <p>Esto puede deberse a varios motivos:</p>
                <ul>
                    <li>La oferta no cumple con nuestras políticas</li>
                    <li>Falta información importante</li>
                    <li>Contenido inapropiado</li>
                </ul>
                <p>Si tienes alguna duda o quieres más información, no dudes en contactar con nuestro equipo de soporte.</p>
                <p>Puedes revisar y modificar tu oferta para volver a enviarla.</p>
            `;
            break;
        default:
            return; // No enviar email para otros estados
    }

    try {
        const result = await tranEmailApi.sendTransacEmail({
            sender,
            to: receivers,
            subject: subject,
            htmlContent: content,
        });
        console.log('Email de notificación de oferta de trabajo enviado:', result);
        return result;
    } catch (error) {
        console.error('Error al enviar email de notificación de oferta de trabajo:', error);
        throw error;
    }
};

/**
 * Envía un email de notificación sobre cambio de estado de una oferta educativa
 * @param {string} email - Email del destinatario
 * @param {string} userName - Nombre del usuario o institución
 * @param {object} offer - Datos de la oferta educativa
 * @param {string} status - Nuevo estado de la oferta (accepted, rejected)
 */
const sendEducationalOfferStatusNotification = async (email, userName, offer, status) => {
    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
    const sender = { email: "jaumefernandezsunyer12@gmail.com", name: "Study" };
    const receivers = [{ email }];

    let subject = '';
    let content = '';

    switch (status) {
        case 'accepted':
            subject = '¡Tu oferta educativa ha sido aceptada!';
            content = `
                <h2>¡Enhorabuena ${userName}!</h2>
                <p>Nos complace informarte que tu oferta educativa <strong>${offer.programName}</strong> ha sido revisada y aceptada.</p>
                <p>Ya está publicada en nuestra plataforma y los usuarios pueden verla.</p>
                <p>Detalles de la oferta:</p>
                <ul>
                    <li><strong>Programa:</strong> ${offer.programName}</li>
                    <li><strong>Institución:</strong> ${offer.institutionName}</li>
                    <li><strong>Tipo:</strong> ${offer.educationType}</li>
                    <li><strong>Modalidad:</strong> ${offer.modality}</li>
                </ul>
                <p>Puedes acceder a tu panel de control para gestionar tu oferta educativa.</p>
                <p>¡Gracias por confiar en nuestra plataforma!</p>
            `;
            break;
        case 'rejected':
            subject = 'Actualización sobre tu oferta educativa';
            content = `
                <h2>Hola ${userName}</h2>
                <p>Lamentamos informarte que tu oferta educativa <strong>${offer.programName}</strong> ha sido rechazada.</p>
                <p>Esto puede deberse a varios motivos:</p>
                <ul>
                    <li>La oferta no cumple con nuestras políticas</li>
                    <li>Falta información importante</li>
                    <li>Contenido inapropiado</li>
                </ul>
                <p>Si tienes alguna duda o quieres más información, no dudes en contactar con nuestro equipo de soporte.</p>
                <p>Puedes revisar y modificar tu oferta para volver a enviarla.</p>
            `;
            break;
        default:
            return; // No enviar email para otros estados
    }

    try {
        const result = await tranEmailApi.sendTransacEmail({
            sender,
            to: receivers,
            subject: subject,
            htmlContent: content,
        });
        console.log('Email de notificación de oferta educativa enviado:', result);
        return result;
    } catch (error) {
        console.error('Error al enviar email de notificación de oferta educativa:', error);
        throw error;
    }
};

module.exports = {
    sendJobOfferStatusNotification,
    sendEducationalOfferStatusNotification
};
