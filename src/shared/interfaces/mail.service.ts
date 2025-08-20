export interface MailService {
  sendMail(to: string, subject: string, text: string, html?: string): Promise<any>;
}
