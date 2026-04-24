import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService } from '../../domain/services/IEmailService';

export class NodemailerEmailService implements IEmailService {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST!,
            port: Number(process.env.EMAIL_PORT ?? 2525),
            auth: {
                user: process.env.EMAIL_USER!,
                pass: process.env.EMAIL_PASS!,
            },
        });
    }

    async sendWelcomeEmail(to: string, name: string, tempPassword: string): Promise<void> {
        await this.transporter.sendMail({
            from: `"AppAI" <${process.env.EMAIL_FROM ?? 'noreply@appai.com'}>`,
            to,
            subject: 'Bienvenido a AppAI — Tu acceso está listo',
            html: this.welcomeTemplate(name, to, tempPassword),
        });
    }

    async sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<void> {
        await this.transporter.sendMail({
            from: `"AppAI" <${process.env.EMAIL_FROM ?? 'noreply@appai.com'}>`,
            to,
            subject: 'Restablece tu contraseña — AppAI',
            html: this.passwordResetTemplate(name, resetLink),
        });
    }

    private welcomeTemplate(name: string, email: string, tempPassword: string): string {
        return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:1px;">AppAI</h1>
          <p style="color:#a0a8c0;margin:8px 0 0;font-size:13px;">Plataforma de Inteligencia Artificial Empresarial</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px;">¡Bienvenido, ${name}!</h2>
          <p style="color:#4a5568;line-height:1.6;margin:0 0 24px;">Tu cuenta ha sido creada exitosamente. A continuación encontrarás tus credenciales de acceso:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e2e8f0;border-radius:6px;margin:0 0 24px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 12px;color:#4a5568;font-size:14px;"><strong>Correo:</strong> ${email}</p>
              <p style="margin:0;color:#4a5568;font-size:14px;"><strong>Contraseña temporal:</strong>
                <span style="display:inline-block;background:#1a1a2e;color:#ffffff;padding:4px 12px;border-radius:4px;font-family:monospace;font-size:15px;letter-spacing:2px;margin-left:8px;">${tempPassword}</span>
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;margin:0 0 28px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0;color:#92400e;font-size:13px;">⚠️ <strong>Importante:</strong> Por seguridad, cambia tu contraseña después de iniciar sesión por primera vez.</p>
            </td></tr>
          </table>
          <p style="color:#4a5568;line-height:1.6;margin:0 0 8px;font-size:14px;">Si tienes alguna duda, contacta al administrador de tu organización.</p>
        </td></tr>
        <tr><td style="background:#f8f9fb;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    private passwordResetTemplate(name: string, resetLink: string): string {
        return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:1px;">AppAI</h1>
          <p style="color:#a0a8c0;margin:8px 0 0;font-size:13px;">Plataforma de Inteligencia Artificial Empresarial</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px;">Hola, ${name}</h2>
          <p style="color:#4a5568;line-height:1.6;margin:0 0 24px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón a continuación para crear una nueva contraseña:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td align="center">
              <a href="${resetLink}" style="display:inline-block;background:#1a1a2e;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:bold;">Restablecer contraseña</a>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;margin:0 0 24px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0;color:#92400e;font-size:13px;">⏰ Este enlace expira en <strong>24 horas</strong>. Si no solicitaste este cambio, ignora este correo.</p>
            </td></tr>
          </table>
          <p style="color:#a0aec0;font-size:12px;margin:0;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${resetLink}" style="color:#1a1a2e;word-break:break-all;">${resetLink}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f8f9fb;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#a0aec0;font-size:12px;margin:0;">Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }
}
