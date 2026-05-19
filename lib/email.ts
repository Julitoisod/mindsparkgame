import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendProgressEmail(to: string, studentName: string, data: {
  levelsCompleted: number
  totalLevels: number
  starBalance: number
  badges: string[]
  latestAchievement?: string
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP not configured, skipping email')
    return false
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7fcf5; border-radius: 12px;">
      <h1 style="color: #00441b; font-size: 24px;">🎮 MindSpark Progress Update</h1>
      <p style="color: #333;">Hello! Here's ${studentName}'s latest progress:</p>
      <div style="background: #e5f5e0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>📚 Levels Completed:</strong> ${data.levelsCompleted}/${data.totalLevels}</p>
        <p style="margin: 4px 0;"><strong>⭐ Stars Earned:</strong> ${data.starBalance}</p>
        <p style="margin: 4px 0;"><strong>🏅 Badges Earned:</strong> ${data.badges.length}</p>
        ${data.latestAchievement ? `<p style="margin: 4px 0;"><strong>🎉 Latest Achievement:</strong> ${data.latestAchievement}</p>` : ''}
      </div>
      <p style="color: #666; font-size: 12px;">This is an automated message from MindSpark Game.</p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'MindSpark <noreply@mindspark.com>',
      to,
      subject: `🎮 ${studentName}'s MindSpark Progress Update`,
      html,
    })
    return true
  } catch (error) {
    console.error('[email] Failed to send:', error)
    return false
  }
}
