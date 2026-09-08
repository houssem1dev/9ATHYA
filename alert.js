// ============================================================
// EMAIL ALERT (RELIABLE)
// ============================================================
async function sendEmailAlert(alertData) {
  try {
    const emailBody = `
🚨 SECURITY ALERT - 9ATHYA.TN 🚨

Type: ${alertData.type}
Severity: ${alertData.severity || 'HIGH'}
Time: ${new Date().toLocaleString('ar-TN')}

IP: ${alertData.ip || 'Unknown'}
Path: ${alertData.path || 'Unknown'}
Action: ${alertData.action || 'Blocked'}

Stats:
- Total Requests: ${requestStats.total}
- Bot Requests: ${requestStats.bots}
- Attacks: ${requestStats.attacks}
- Unique IPs: ${requestStats.uniqueIPs.size}

${alertData.message || ''}

🔗 Check your site: https://www.9aadhiya.tech
    `;

    const formData = new FormData();
    formData.append('email', 'houssemkessentini77@gmail.com');
    formData.append('subject', '🚨 9ATHYA.TN - Security Alert');
    formData.append('message', emailBody);
    formData.append('_captcha', 'false');

    const response = await fetch('https://formsubmit.co/ajax/houssemkessentini77@gmail.com', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log('✅ Email alert sent');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
}
