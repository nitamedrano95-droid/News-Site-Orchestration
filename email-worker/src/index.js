export default {
  async email(message, env, ctx) {
    await env.EMAIL.send({
      to: "opaicmt2@sre.gob.mx",
      from: { email: "cuartodepaz@bitacoraurbana.lat", name: "Carlos Azeem Sanchez" },
      subject: "Respuesta",
      html: `<p>En respuesta a su correo electrónico con asunto "Verificación de Carta", le informamos que el correo y el documento adjunto fueron entregados correctamente a Marcela De Jesus Natalia.</p>

<p>Agradecemos su atención.</p>

<p>Atentamente,<br>
Carlos Azeem Sanchez,<br>
Director General</p>`,
      text: `En respuesta a su correo electrónico con asunto "Verificación de Carta", le informamos que el correo y el documento adjunto fueron entregados correctamente a Marcela De Jesus Natalia.

Agradecemos su atención.

Atentamente,
Carlos Azeem Sanchez,
Director General`,
    });
  },
};