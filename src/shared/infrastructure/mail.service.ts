import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailService as MailServiceInterface } from '../interfaces/mail.service';

@Injectable()
export class MailService implements MailServiceInterface {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'user@example.com',
      pass: process.env.SMTP_PASS || 'password',
    },
  });

  async sendMail(to: string, subject: string, text: string, html?: string): Promise<any> {
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to,
      subject,
      text,
      html,
    });
  }
}
