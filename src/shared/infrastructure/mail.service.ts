import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailService as MailServiceInterface } from '../interfaces/mail.service';

@Injectable()
export class MailService implements MailServiceInterface {
  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  async sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<any> {
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to,
      subject,
      text,
      html,
    });
  }
}
