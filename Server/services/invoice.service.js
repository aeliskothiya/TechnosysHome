import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import Invoice from '../models/Invoice.js';
import SubscriptionHistory from '../models/SubscriptionHistory.js';
import { getIo } from '../config/realtime.js';
import transporter from '../config/nodemailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateInvoice({ refType = 'SubscriptionPayment', refId, paymentRecord, subscriptionPackage = {}, recipient = {}, historyId = null }) {
  try {
    const invoiceDir = path.join(process.cwd(), 'uploads', 'invoices');
    if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

    const invoiceFilename = `invoice_${String(refId)}.pdf`;
    const invoicePath = path.join(invoiceDir, invoiceFilename);

    const invoiceDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    const amountNum = Number(paymentRecord?.Amount || subscriptionPackage?.price || 0);
    const amountDisplay = `₹${amountNum.toFixed(2)}`;

    // Resolve logo paths used by the original template
    const logoPngPath = path.join(__dirname, '..', '..', 'Client', 'public', 'navbarlogo.png');
    const logoSvgPath = path.join(__dirname, '..', '..', 'Client', 'public', 'navbarlogo.svg');
    let logoDataUri = null;
    let logoBuffer = null;
    try {
      if (fs.existsSync(logoPngPath)) {
        logoBuffer = fs.readFileSync(logoPngPath);
        logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } else if (fs.existsSync(logoSvgPath)) {
        const svgText = fs.readFileSync(logoSvgPath, 'utf8');
        logoDataUri = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`;
        try {
          const sharpModule = await import('sharp').catch(() => null);
          if (sharpModule) {
            const sharp = sharpModule.default || sharpModule;
            const pngBuf = await sharp(Buffer.from(svgText)).png().toBuffer();
            logoBuffer = pngBuf;
            logoDataUri = `data:image/png;base64,${pngBuf.toString('base64')}`;
          }
        } catch (e) {
          // ignore sharp errors
        }
        if (!logoBuffer) {
          try {
            const puppeteerModule = await import('puppeteer').catch(() => null);
            if (puppeteerModule) {
              const puppeteer = puppeteerModule.default || puppeteerModule;
              const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
              const p = await b.newPage();
              await p.setContent(`<html><body style="margin:0;padding:0">${svgText}</body></html>`, { waitUntil: 'networkidle0' });
              const pngBuf = await p.screenshot({ omitBackground: true, type: 'png' });
              await b.close();
              logoBuffer = pngBuf;
              logoDataUri = `data:image/png;base64,${pngBuf.toString('base64')}`;
            }
          } catch (e) {
            // ignore puppeteer errors
          }
        }
      }
    } catch (logoErr) {
      console.warn('Invoice service: logo load failed', logoErr?.message || logoErr);
    }

    // Use exactly the same HTML/CSS as original to keep style unchanged
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice</title>
  <style>
    :root{ --accent:#4a56e2; --muted:#f3f6fb; --text:#333; --light:#6b7280; --border:#e6eaf2; --paper-bg:#ffffff; font-size:14px; }
    *{box-sizing:border-box}
    body{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;  padding:30px 20px; }
    .sheet{ max-width:800px; margin:0 auto; border-radius:4px;overflow:hidden; }
    .pad{padding:28px 36px}
    .header{display:flex;align-items:flex-start;justify-content:space-between}
    .brand{display:flex;gap:12px;align-items:center}
    .brand h1{font-size:20px;margin:0;padding:0;line-height:1}
    .meta{ text-align:right;color:var(--light) }
    .meta .date{font-weight:600;color:var(--accent)}
    .meta .invoice{margin-top:6px;font-weight:600}
    .addresses{display:flex;gap:20px;margin-top:18px}
    .addr{flex:1;padding:18px;border-radius:4px}
    .addr h4{margin:0 0 8px 0}
    .muted small{display:block;color:var(--light)}
    table{width:100%;border-collapse:collapse;margin-top:26px}
    thead th{border-bottom:2px solid var(--border);text-align:left;padding:12px 8px;color:var(--accent);font-weight:700}
    tbody td{padding:14px 8px;border-bottom:1px solid var(--border);vertical-align:top}
    tbody tr td:nth-child(1){width:32px}
    .col-price,.col-qty,.col-sub{white-space:nowrap;text-align:right}
    .totals{display:flex;justify-content:flex-end;margin-top:18px}
    .totals .box{width:240px}
    .totals .row{display:flex;justify-content:space-between;padding:8px 0;color:var(--light)}
    .totals .row.total{background:linear-gradient(180deg,#3f45d6,#2b2fc4);color:#fff;padding:12px;border-radius:4px;margin-top:8px;align-items:center}
    .totals .row.total .label{font-weight:700}
    .payment{margin-top:30px}
    .payment h5{color:var(--accent);margin-bottom:8px}
    .notes{margin-top:12px;color:var(--light);font-size:13px}
    .footer{background:var(--muted);padding:12px 36px;font-size:13px;color:var(--light);display:flex;justify-content:space-between;align-items:center}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="pad">
      <div class="header">
        <div class="brand">
          <div class="logo" style="padding:0;margin:0;width:55px;height:55px;display:flex;align-items:center;justify-content:center;">
            ${logoDataUri ? `<img src="${logoDataUri}" alt="logo" style="width:55px;height:55px;object-fit:contain;margin:0;padding:0"/>` : ''}
          </div>
          <div style="margin:0;padding:0;line-height:1;">
            <h1>Technosys</h1>
          </div>
        </div>
        <div class="meta">
          <div class="date">${invoiceDate}</div>
          <div class="invoice">Invoice # <strong>${refId}</strong></div>
        </div>
      </div>

      <table class="addresses-table" style="width:100%;border-collapse:separate;border-spacing:0;margin-top:18px;">
        <tr>
          <td style="vertical-align:top;padding-right:12px;width:50%;">
            <div class="addr" style="margin:0">
              <h4>Supplier Company INC</h4>
              <div class="muted">
                <small>Number: 23456789</small>
                <small>6622 Abshire Mills</small>
                <small>Port Orlofurt, 05820</small>
                <small>United States</small>
              </div>
            </div>
          </td>
          <td style="vertical-align:top;padding-left:12px;width:50%;text-align:right;">
            <div class="addr" style="margin:0;text-align:right">
              <h4>${recipient?.Name || 'Customer'}</h4>
              <div class="muted" style="text-align:right">
                <small>Number: ${recipient?.MobileNumber || ''}</small>
                <small>Email: ${recipient?.Email || ''}</small>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>Index</th>
            <th>Product details</th>
            <th class="col-price">Price</th>
            <th class="col-qty">Qty.</th>
            <th class="col-sub">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1.</td>
            <td>${subscriptionPackage?.name || 'Subscription Package'}</td>
            <td class="col-price">${amountDisplay}</td>
            <td class="col-qty">${subscriptionPackage?.coins || 0}</td>
            <td class="col-sub">${amountDisplay}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="box">
          <div class="row"><div class="label">Net total:</div><div class="value">${amountDisplay}</div></div>
          <div class="row total"><div class="label">Total:</div><div class="value">${amountDisplay}</div></div>
        </div>
      </div>

      <div class="payment">
        <h5>PAYMENT DETAILS</h5>
        <div>
          Method: ${paymentRecord?.Method || 'Razorpay'}<br>
          Payment ID: ${paymentRecord?.ProviderPaymentId || '-'}<br>
        </div>

        <div class="notes">
          <strong>Notes</strong>
          <p>Thank you for your purchase. If you need help, contact Technosys support.</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>Supplier Company</div>
      <div>info@company.com | +1-202-555-0106</div>
    </div>
  </div>
</body>
</html>`;

    let pdfGenerated = false;
    try {
      const puppeteerModule = await import('puppeteer').catch(() => null);
      if (puppeteerModule) {
        const puppeteer = puppeteerModule.default || puppeteerModule;
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({ path: invoicePath, format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' } });
        await browser.close();
        pdfGenerated = true;
      }
    } catch (e) {
      console.warn('Invoice service: puppeteer failed, falling back to PDFKit', e?.message || e);
      pdfGenerated = false;
    }

    if (!pdfGenerated) {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(invoicePath);
      doc.pipe(stream);

      const ACCENT = '#4a56e2';
      const LIGHT = '#6b7280';
      const BORDER = '#e6eaf2';

      const headerY = doc.y;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 40, headerY, { width: 56, height: 28 });
        } catch (e) {
          doc.rect(40, headerY, 56, 28).fill('#6b46ff');
          doc.fillColor('#fff').fontSize(14).text('M', 58, headerY + 6, { align: 'center' });
          doc.fillColor('#000');
        }
      } else {
        doc.rect(40, headerY, 56, 28).fill('#6b46ff');
        doc.fillColor('#fff').fontSize(14).text('M', 58, headerY + 6, { align: 'center' });
        doc.fillColor('#000');
      }

      doc.fontSize(22).fillColor(ACCENT).text('Technosys Invoice', 0, headerY, { align: 'center' }).moveDown(0.5);
      doc.fontSize(11).fillColor(LIGHT).text(`Date: ${invoiceDate}`).text(`Invoice ID: ${refId}`).text(`Payment ID: ${paymentRecord?.ProviderPaymentId || '-'}`).moveDown(1.2);

      doc.fontSize(13).fillColor('#000').text('Supplier', { underline: true });
      doc.fontSize(11).fillColor(LIGHT).text('Technosys Pvt Ltd').text('Customer Support Street, India').text('Email: support@technosys.com').moveDown(1);

      doc.fontSize(13).fillColor('#000').text('Billed To:', { underline: true });
      doc.fontSize(11).fillColor(LIGHT).text(`${recipient?.Name || ''}`).text(`${recipient?.Email || ''}`).text(`${recipient?.MobileNumber || ''}`).moveDown(1);

      const tableTop = doc.y + 5;
      doc.fontSize(12).fillColor(ACCENT);
      doc.text('Index', 40, tableTop);
      doc.text('Product Details', 100, tableTop);
      doc.text('Price', 330, tableTop, { width: 80, align: 'right' });
      doc.text('Qty', 410, tableTop, { width: 60, align: 'right' });
      doc.text('Subtotal', 470, tableTop, { width: 80, align: 'right' });

      doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).strokeColor(BORDER).lineWidth(1).stroke();

      let rowY = tableTop + 30;
      const priceNum = amountNum;
      doc.fontSize(11).fillColor('#000');
      doc.text('1.', 40, rowY);
      doc.text(subscriptionPackage?.name || 'Subscription Package', 100, rowY);
      doc.text(`₹${priceNum.toFixed(2)}`, 330, rowY, { width: 80, align: 'right' });
      doc.text('1', 410, rowY, { width: 60, align: 'right' });
      doc.text(`₹${priceNum.toFixed(2)}`, 470, rowY, { width: 80, align: 'right' });

      rowY += 25;
      doc.moveDown(2);

      const totalY = rowY + 20;
      doc.fontSize(12).fillColor(LIGHT).text('Net Total:', 350, totalY, { width: 120, align: 'right' });
      doc.fontSize(12).fillColor('#000').text(`₹${priceNum.toFixed(2)}`, 470, totalY, { width: 80, align: 'right' });

      doc.rect(350, totalY + 30, 200, 30).fill(ACCENT);
      doc.fillColor('#fff').fontSize(13).text('Total:', 360, totalY + 38);
      doc.text(`₹${priceNum.toFixed(2)}`, 470, totalY + 38, { width: 80, align: 'right' });
      doc.fillColor('#000');

      doc.moveDown(4);
      doc.fontSize(12).fillColor(ACCENT).text('Notes');
      doc.fontSize(11).fillColor(LIGHT).text('Thank you for your purchase. If you need help, contact Technosys support.').moveDown(2);

      doc.moveTo(40, 780).lineTo(550, 780).strokeColor(BORDER).stroke();
      doc.fontSize(10).fillColor(LIGHT).text('Technosys Pvt Ltd', 40, 790);
      doc.text('support@technosys.com | +91 9876543210', 350, 790, { align: 'right' });

      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    }

    const invoiceDoc = new Invoice({ ref_type: refType, ref_id: refId, invoice_pdf: `/uploads/invoices/${invoiceFilename}` });
    await invoiceDoc.save();

    // Emit realtime update for SubscriptionHistory when applicable
    try {
      const io = getIo();
      if (io && historyId) {
        const histDoc = await SubscriptionHistory.findById(historyId).populate({ path: 'PackageID', select: 'name coins price description' }).lean();
        if (histDoc) {
          histDoc.invoice_pdf = invoiceDoc.invoice_pdf;
          io.emit('db_change', { model: 'SubscriptionHistory', operation: 'update', doc: histDoc });
        }
      }
    } catch (emitErr) {
      console.warn('Invoice service: realtime emit failed', emitErr?.message || emitErr);
    }

    // Send email with attachment if recipient email present
    if (recipient?.Email) {
      const mailOptions = {
        from: process.env.SENDER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipient.Email,
        subject: 'Your Technosys Invoice',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
          `<h2 style="color: #155DFC; text-align: center;">Invoice from Technosys</h2>` +
          `<p>Dear <strong>${recipient?.Name || ''}</strong>,</p>` +
          `<p>Thank you for your purchase. Please find the invoice attached for your recent subscription.</p>` +
          `<div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; margin: 18px 0;">` +
          `<p style="margin: 0;"><strong>Invoice Details</strong></p>` +
          `<ul style="margin: 8px 0 0 16px; padding: 0;">` +
          `<li><strong>Invoice ID:</strong> ${refId}</li>` +
          `<li><strong>Payment ID:</strong> ${paymentRecord?.ProviderPaymentId || ''}</li>` +
          `<li><strong>Package:</strong> ${subscriptionPackage?.name || ''}</li>` +
          `<li><strong>Amount:</strong> ${amountDisplay}</li>` +
          `</ul>` +
          `</div>` +
          `<p>If you have any questions, please contact our support team.</p>` +
          `<p>Best regards,<br/><strong>Technosys Team</strong></p>` +
          `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>` +
          `<p style="color: #6b7280; font-size: 12px; text-align: center;">This is an automated message. Please do not reply to this email.</p>` +
          `</div>`,
        attachments: [ { filename: invoiceFilename, path: invoicePath } ],
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error('Invoice service: sendMail failed', mailErr);
      }
    }

    return invoiceDoc;
  } catch (err) {
    console.error('Invoice service error', err);
    throw err;
  }
}
