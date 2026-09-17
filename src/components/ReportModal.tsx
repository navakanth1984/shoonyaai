import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Cpu, 
  TrendingUp, 
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  FileCode,
  FileDown,
  Loader2,
  Mail,
  Send,
  ExternalLink,
  AlertCircle,
  History,
  AtSign
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../mockData';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  activeRole,
}) => {
  const currentRole = ROLE_PERMISSIONS[activeRole];
  const [reportType, setReportType] = useState('executive');
  const [focusArea, setFocusArea] = useState('Summarize weekly ingestion volume, cloud warehouse compute spend, and top 3 ML optimization recommendations');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'excel' | 'html' | 'md' | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Email Stakeholder Report State
  const [isEmailPanelOpen, setIsEmailPanelOpen] = useState(false);
  const [stakeholderEmail, setStakeholderEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<{
    messageId: string;
    recipient: string;
    dispatchedAt: string;
    smtpRelayStatus: string;
  } | null>(null);
  const [sentHistory, setSentHistory] = useState<Array<{
    messageId: string;
    recipient: string;
    dispatchedAt: string;
    title: string;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [generatedReport, setGeneratedReport] = useState<any>({
    title: 'ShoonyaAI Weekly Executive Data & Infrastructure Briefing',
    generatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    summary: 'The ShoonyaAI autonomous ingestion grid sustained 100% uptime over the past 7 days, processing 684.2 million events across Snowflake, BigQuery, and Databricks endpoints with a 99.98% SLA compliance rate.',
    metrics: [
      { label: 'Total Ingested Volume', value: '684.2M events' },
      { label: 'Mean End-to-End Latency', value: '235 ms' },
      { label: 'Warehouse Compute Cost', value: '$2,446.90' },
      { label: 'Sensitive Records Masked', value: '1,420,000' }
    ],
    sections: [
      {
        heading: '1. Ingestion Pipeline Health & SLA Performance',
        content: 'All continuous CDC streaming and micro-batch pipelines maintained sub-second delivery targets. Automated backpressure buffering prevented data loss during a 3x traffic surge on Thursday afternoon.'
      },
      {
        heading: '2. Multi-Cloud Warehouse Resource Utilization',
        content: 'Snowflake Enterprise consumption represented 52% of total spend ($1,270), followed by Google BigQuery at 28% ($685). Automated query pruning and cluster auto-suspend saved approximately $490 in unused compute credits.'
      },
      {
        heading: '3. Security, Governance & PII Sanitization',
        content: 'Zero unmasked PII records reached downstream analytics marts. SHA-256 tokenization was applied to all customer email and phone fields in strict compliance with GDPR Art. 32 and SOC2 criteria.'
      }
    ],
    recommendations: [
      'Implement auto-suspend timeout reduction (60s) on TRANSFORM_DBT_XL to capture an additional 12% compute savings.',
      'Promote MQTT IoT Gateway pipeline from micro-batch to continuous streaming to reduce anomaly detection latency.',
      'Review Databricks Delta Lake partition clustering keys prior to anticipated Black Friday volume surge.'
    ]
  });

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, focusArea })
      });

      if (!res.ok) throw new Error('Report synthesis failed');
      const data = await res.json();
      setGeneratedReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedReport) return;
    const text = `${generatedReport.title}\nDate: ${generatedReport.generatedAt}\n\nSummary:\n${generatedReport.summary}\n\n` +
      generatedReport.sections.map((s: any) => `${s.heading}\n${s.content}\n`).join('\n') +
      `\nRecommendations:\n` + generatedReport.recommendations.map((r: any) => `- ${r}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Client-Side PDF Generation using jsPDF
  const handleDownloadPDF = () => {
    if (!generatedReport) return;
    setExportingFormat('pdf');

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 22) {
          doc.addPage();
          y = margin + 4;
          return true;
        }
        return false;
      };

      // Header Banner (Navy Dark)
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(99, 102, 241); // indigo-500
      doc.text('SHOONYAAI ENTERPRISE DATA PLATFORM', margin + 6, y + 8);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`Autonomous Data Architecture & Pipeline Intelligence • Generated: ${generatedReport.generatedAt}`, margin + 6, y + 16);

      y += 28;

      // Report Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(generatedReport.title, contentWidth);
      doc.text(titleLines, margin, y);
      y += (titleLines.length * 6.5) + 3;

      // Metadata Bar
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Classification: STRICTLY CONFIDENTIAL  |  Audited By Role: ${currentRole.label}  |  Engine SLA: 99.98%`, margin, y);
      y += 6;

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;

      // Section: Executive Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text('1. EXECUTIVE SUMMARY & AUDIT OVERVIEW', margin, y);
      y += 4.5;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      const summaryLines = doc.splitTextToSize(generatedReport.summary, contentWidth - 8);
      const summaryBoxHeight = (summaryLines.length * 4.6) + 8;
      
      doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(summaryLines, margin + 4, y + 5.5);
      y += summaryBoxHeight + 7;

      // Section: Key Performance & Ingestion Metrics
      checkPageBreak(32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text('2. AUDITED INGESTION & PIPELINE METRICS', margin, y);
      y += 4.5;

      if (generatedReport.metrics && generatedReport.metrics.length > 0) {
        const metricsCount = generatedReport.metrics.length;
        const colGap = 3;
        const colWidth = (contentWidth - ((metricsCount - 1) * colGap)) / metricsCount;
        const cardHeight = 18;

        generatedReport.metrics.forEach((m: any, idx: number) => {
          const cardX = margin + (idx * (colWidth + colGap));
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(cardX, y, colWidth, cardHeight, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(doc.splitTextToSize(m.label, colWidth - 4), cardX + 3, y + 5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(String(m.value), cardX + 3, y + 14);
        });

        y += cardHeight + 7;
      }

      // Detailed Pipeline Audit Sections
      if (generatedReport.sections && generatedReport.sections.length > 0) {
        generatedReport.sections.forEach((sec: any) => {
          checkPageBreak(26);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(sec.heading, margin, y);
          y += 4.2;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.2);
          doc.setTextColor(71, 85, 105);
          const contentLines = doc.splitTextToSize(sec.content, contentWidth);
          
          contentLines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin, y);
            y += 4.2;
          });

          y += 3.5;
        });
      }

      // Actionable Recommendations Box
      if (generatedReport.recommendations && generatedReport.recommendations.length > 0) {
        checkPageBreak(36);
        y += 2;
        doc.setFillColor(238, 242, 255); // indigo-50
        doc.setDrawColor(199, 210, 254); // indigo-200
        
        const recLinesArray: string[][] = [];
        generatedReport.recommendations.forEach((rec: string) => {
          recLinesArray.push(doc.splitTextToSize(`•  ${rec}`, contentWidth - 10));
        });

        const totalRecLines = recLinesArray.reduce((acc, lines) => acc + lines.length, 0);
        const recBoxHeight = 12 + (totalRecLines * 4.2);

        doc.roundedRect(margin, y, contentWidth, recBoxHeight, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(67, 56, 202); // indigo-700
        doc.text('ACTIONABLE STRATEGIC RECOMMENDATIONS', margin + 5, y + 6);

        let recY = y + 11;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        recLinesArray.forEach((lines) => {
          lines.forEach((l) => {
            doc.text(l, margin + 5, recY);
            recY += 4.2;
          });
        });

        y += recBoxHeight + 6;
      }

      // Add footers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`ShoonyaAI Autonomous Data Ingestion Grid • Confidential Stakeholder Brief`, margin, pageHeight - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
      }

      const fileName = `shoonyai_analytics_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      setExportSuccess('PDF downloaded successfully!');
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  // Client-Side Excel Generation using xlsx (SheetJS)
  const handleDownloadExcel = () => {
    if (!generatedReport) return;
    setExportingFormat('excel');

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive Summary
      const summaryData = [
        ['SHOONYAAI ENTERPRISE DATA PLATFORM - ANALYTICS BRIEFING'],
        ['Report Title', generatedReport.title],
        ['Generated Date', generatedReport.generatedAt],
        ['Access Role', currentRole.label],
        ['Classification', 'Strictly Confidential'],
        [''],
        ['EXECUTIVE SUMMARY'],
        [generatedReport.summary],
        [''],
        ['KEY PERFORMANCE METRICS SUMMARY'],
        ...generatedReport.metrics.map((m: any) => [m.label, m.value]),
        [''],
        ['ACTIONABLE STRATEGIC RECOMMENDATIONS'],
        ...generatedReport.recommendations.map((r: string, idx: number) => [`${idx + 1}.`, r])
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 32 }, { wch: 75 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

      // Sheet 2: Metrics Table
      const metricsHeader = [['Metric Category & Label', 'Recorded Metric Value', 'Evaluation Grade', 'SLA Status']];
      const metricsRows = (generatedReport.metrics || []).map((m: any) => [
        m.label,
        m.value,
        'Enterprise SLA Compliant',
        'ACTIVE'
      ]);
      const wsMetrics = XLSX.utils.aoa_to_sheet([...metricsHeader, ...metricsRows]);
      wsMetrics['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 26 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsMetrics, 'Metrics Breakdown');

      // Sheet 3: Pipeline Audit Sections
      const sectionsHeader = [['Section Index', 'Topic & Section Heading', 'Detailed Audit Narrative & Governance Findings']];
      const sectionsRows = (generatedReport.sections || []).map((sec: any, idx: number) => [
        idx + 1,
        sec.heading,
        sec.content
      ]);
      const wsSections = XLSX.utils.aoa_to_sheet([...sectionsHeader, ...sectionsRows]);
      wsSections['!cols'] = [{ wch: 14 }, { wch: 45 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsSections, 'Audit Sections');

      const fileName = `shoonyai_analytics_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setExportSuccess('Excel workbook downloaded!');
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to generate Excel:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  // Client-Side HTML Generation with Standalone Stylesheet & Print Support
  const handleDownloadHTML = () => {
    if (!generatedReport) return;
    setExportingFormat('html');

    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${generatedReport.title} - ShoonyaAI Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #6366f1;
      --accent: #06b6d4;
      --success: #10b981;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --card-border: #e2e8f0;
        --text: #0f172a;
        --text-muted: #64748b;
        --primary: #4f46e5;
        --accent: #0891b2;
        --success: #059669;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 32px 16px;
    }
    .container {
      max-width: 880px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--card-border);
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      border: 1px solid rgba(99, 102, 241, 0.3);
    }
    .timestamp {
      font-size: 12px;
      color: var(--text-muted);
      font-family: monospace;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      margin: 12px 0 16px;
      line-height: 1.3;
    }
    .summary-box {
      background: rgba(99, 102, 241, 0.06);
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 32px;
      font-size: 14.5px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 36px;
    }
    .metric-card {
      background: rgba(0,0,0,0.03);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
    }
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 20px;
      font-weight: 800;
      font-family: monospace;
      color: var(--text);
    }
    .section-block {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
    }
    .section-body {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.7;
    }
    .recommendations-box {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 14px;
      padding: 24px;
      margin-top: 36px;
    }
    .recommendations-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--success);
      margin-top: 0;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    ul.recommendations-list {
      margin: 0;
      padding-left: 20px;
      font-size: 14px;
    }
    ul.recommendations-list li {
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--card-border);
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .actions {
      margin-bottom: 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      background: var(--primary);
      color: #ffffff;
      text-decoration: none;
    }
    @media print {
      .actions { display: none; }
      body { background: white; color: black; padding: 0; }
      .container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .metric-card, .summary-box, .recommendations-box { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="container">
    <div class="header-banner">
      <div>
        <span class="badge">ShoonyaAI Intelligence Report</span>
      </div>
      <div class="timestamp">Generated: ${generatedReport.generatedAt}</div>
    </div>

    <h1>${generatedReport.title}</h1>

    <div class="summary-box">
      <strong>Executive Briefing:</strong> ${generatedReport.summary}
    </div>

    <div class="metrics-grid">
      ${(generatedReport.metrics || []).map((m: any) => `
        <div class="metric-card">
          <div class="metric-label">${m.label}</div>
          <div class="metric-value">${m.value}</div>
        </div>
      `).join('')}
    </div>

    ${(generatedReport.sections || []).map((sec: any) => `
      <div class="section-block">
        <div class="section-title">${sec.heading}</div>
        <div class="section-body">${sec.content}</div>
      </div>
    `).join('')}

    ${generatedReport.recommendations && generatedReport.recommendations.length > 0 ? `
      <div class="recommendations-box">
        <div class="recommendations-title">✓ Actionable Strategic Recommendations</div>
        <ul class="recommendations-list">
          ${generatedReport.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="footer">
      <span>ShoonyaAI Autonomous Data Ingestion & Transformation Engine</span>
      <span>Confidential • Audited Role: ${currentRole.label}</span>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shoonyai_report_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess('HTML document downloaded!');
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to generate HTML:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!generatedReport) return;
    setExportingFormat('md');
    try {
      const text = `# ${generatedReport.title}\n**Generated:** ${generatedReport.generatedAt}\n\n## Executive Summary\n${generatedReport.summary}\n\n` +
        `## Key Metrics\n` + generatedReport.metrics.map((m: any) => `- **${m.label}:** ${m.value}`).join('\n') + `\n\n` +
        generatedReport.sections.map((s: any) => `## ${s.heading}\n${s.content}\n`).join('\n\n') +
        `\n\n## Actionable Recommendations\n` + generatedReport.recommendations.map((r: any) => `- ${r}`).join('\n');

      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shoonyai_report_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess('Markdown downloaded!');
      setTimeout(() => setExportSuccess(null), 3000);
    } finally {
      setExportingFormat(null);
    }
  };

  const quickStakeholders = [
    { label: 'C-Suite Exec', email: 'exec-leadership@enterprise.io' },
    { label: 'Data Platform Lead', email: 'data-leads@shoonya.ai' },
    { label: 'Sec & Compliance', email: 'sec-compliance@enterprise.io' },
    { label: 'FinOps & Spend', email: 'finops-team@enterprise.io' },
  ];

  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!generatedReport) return;

    setEmailError(null);
    const trimmedEmail = stakeholderEmail.trim();

    if (!trimmedEmail) {
      setEmailError('Please enter a valid stakeholder email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address format (e.g. stakeholder@company.com).');
      return;
    }

    setIsSendingEmail(true);

    try {
      const subject = emailSubject.trim() || `[ShoonyaAI Briefing] ${generatedReport.title}`;
      const payload = {
        recipientEmail: trimmedEmail,
        subject,
        personalNote: personalNote.trim(),
        report: generatedReport,
        senderRole: currentRole.label,
      };

      const res = await fetch('/api/reports/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch report email');
      }

      setEmailSuccess({
        messageId: data.messageId,
        recipient: data.recipient,
        dispatchedAt: data.dispatchedAt,
        smtpRelayStatus: data.smtpRelayStatus,
      });

      setSentHistory(prev => [
        {
          messageId: data.messageId,
          recipient: data.recipient,
          dispatchedAt: data.dispatchedAt,
          title: generatedReport.title,
        },
        ...prev
      ]);

      setExportSuccess(`Report emailed to ${trimmedEmail}`);
      setTimeout(() => setExportSuccess(null), 4000);
      setPersonalNote('');
    } catch (err: any) {
      console.error('Email report error:', err);
      setEmailError(err.message || 'Error occurred while dispatching email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOpenMailto = () => {
    if (!generatedReport) return;
    const recipient = stakeholderEmail.trim();
    const subject = encodeURIComponent(emailSubject.trim() || `[ShoonyaAI Briefing] ${generatedReport.title}`);
    
    const bodyLines = [
      `SHOONYAAI ENTERPRISE DATA PLATFORM - INTELLIGENCE BRIEFING`,
      `Title: ${generatedReport.title}`,
      `Date: ${generatedReport.generatedAt}`,
      `Audited Role: ${currentRole.label}`,
      ``,
      `EXECUTIVE SUMMARY:`,
      `${generatedReport.summary}`,
      ``,
      `KEY METRICS:`,
      ...(generatedReport.metrics || []).map((m: any) => `- ${m.label}: ${m.value}`),
      ``,
      `AUDIT FINDINGS:`,
      ...(generatedReport.sections || []).map((s: any) => `[${s.heading}]\n${s.content}`),
      ``,
      `STRATEGIC RECOMMENDATIONS:`,
      ...(generatedReport.recommendations || []).map((r: string, idx: number) => `${idx + 1}. ${r}`),
      ``,
      personalNote ? `SENDER NOTE: "${personalNote}"\n` : '',
      `Dispatched via ShoonyaAI Autonomous Data Ingestion Platform`
    ].join('\n');

    const body = encodeURIComponent(bodyLines);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Automated Stakeholder Report Synthesis</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  GEMINI AI
                </span>
              </h3>
              <p className="text-xs text-slate-500">Custom business intelligence & pipeline audit briefings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Report Scope & Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="executive">Executive Stakeholder Brief</option>
                  <option value="security">Security & Compliance Audit</option>
                  <option value="financial">Warehouse Spend & FinOps</option>
                  <option value="engineering">Pipeline SLA & Engineering</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Prompt / Focus Instructions
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    placeholder="e.g. Highlight compute cost spikes, SLA breaches, and partition recommendations..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <Cpu className="w-4 h-4 animate-spin" />
                        <span>Writing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Document Card */}
          {generatedReport && (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              
              {/* Report Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
                      SHOONYAAI INTELLIGENCE BRIEF
                    </span>
                    <span className="text-xs text-slate-400">&bull; {generatedReport.generatedAt}</span>
                  </div>
                  
                  {/* Quick Export Pills in Report Header */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      id="pill-email-report"
                      onClick={() => {
                        setIsEmailPanelOpen(prev => !prev);
                        if (!emailSubject && generatedReport) {
                          setEmailSubject(`[ShoonyaAI Briefing] ${generatedReport.title}`);
                        }
                      }}
                      title="Email report directly to stakeholders"
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                        isEmailPanelOpen
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                      }`}
                    >
                      <Mail className="w-3 h-3" />
                      <span>Email Report</span>
                    </button>
                    <button
                      id="pill-download-pdf"
                      onClick={handleDownloadPDF}
                      disabled={!currentRole.canExportReports || exportingFormat === 'pdf'}
                      title="Download as PDF document"
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {exportingFormat === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                      <span>PDF</span>
                    </button>
                    <button
                      id="pill-download-excel"
                      onClick={handleDownloadExcel}
                      disabled={!currentRole.canExportReports || exportingFormat === 'excel'}
                      title="Download as Excel workbook (.xlsx)"
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {exportingFormat === 'excel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                      <span>Excel</span>
                    </button>
                    <button
                      id="pill-download-html"
                      onClick={handleDownloadHTML}
                      disabled={!currentRole.canExportReports || exportingFormat === 'html'}
                      title="Download as standalone HTML report"
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/80 text-cyan-600 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {exportingFormat === 'html' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCode className="w-3 h-3" />}
                      <span>HTML</span>
                    </button>
                    <button
                      id="pill-copy-report"
                      onClick={handleCopy}
                      title="Copy summary to clipboard"
                      className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                  {generatedReport.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {generatedReport.summary}
                </p>
              </div>

              {/* Expandable Email Stakeholder Report Form Panel */}
              {isEmailPanelOpen && (
                <div
                  id="email-report-panel"
                  className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/70 to-white dark:from-indigo-950/50 dark:to-slate-900 p-5 shadow-sm space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Email Report to Stakeholder</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300">
                            Direct Dispatch
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Send the currently generated intelligence summary and audit recommendations directly to any stakeholder inbox.
                        </p>
                      </div>
                    </div>
                    <button
                      id="btn-close-email-panel"
                      onClick={() => setIsEmailPanelOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer transition-colors"
                      title="Close email panel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Success Alert Banner */}
                  {emailSuccess && (
                    <div
                      id="email-success-banner"
                      className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-800 dark:text-emerald-200">
                            Report successfully dispatched to <span className="underline">{emailSuccess.recipient}</span>
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                            Tracking ID: {emailSuccess.messageId} &bull; Relay: {emailSuccess.smtpRelayStatus}
                          </p>
                          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                            Dispatched at {new Date(emailSuccess.dispatchedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <button
                        id="btn-dismiss-email-success"
                        onClick={() => setEmailSuccess(null)}
                        className="text-emerald-600 dark:text-emerald-400 hover:opacity-80 cursor-pointer text-[11px] font-semibold"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Error Alert Banner */}
                  {emailError && (
                    <div
                      id="email-error-banner"
                      className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendEmail} className="space-y-3.5">
                    {/* Recipient Email */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="stakeholder-email-input"
                          className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                        >
                          <AtSign className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Stakeholder Email Address</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Required</span>
                      </div>
                      <input
                        id="stakeholder-email-input"
                        type="email"
                        value={stakeholderEmail}
                        onChange={(e) => {
                          setStakeholderEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        placeholder="e.g., alex.cto@enterprise.io, board@company.com"
                        required
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                      />

                      {/* Quick Stakeholder Presets */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400">Quick Recipient:</span>
                        {quickStakeholders.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            id={`quick-recipient-${idx}`}
                            onClick={() => {
                              setStakeholderEmail(s.email);
                              if (emailError) setEmailError(null);
                            }}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                          >
                            {s.label} ({s.email})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div>
                      <label
                        htmlFor="email-subject-input"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Email Subject
                      </label>
                      <input
                        id="email-subject-input"
                        type="text"
                        value={emailSubject || `[ShoonyaAI Briefing] ${generatedReport.title}`}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Personal Message Note */}
                    <div>
                      <label
                        htmlFor="personal-note-input"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Optional Stakeholder Note / Instructions
                      </label>
                      <textarea
                        id="personal-note-input"
                        rows={2}
                        value={personalNote}
                        onChange={(e) => setPersonalNote(e.target.value)}
                        placeholder="e.g., Hi team, sharing our latest ingestion volume and warehouse optimization brief for tomorrow's executive review..."
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    {/* Summary Payload Details */}
                    <div className="p-3 rounded-lg bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>
                          Payload: <strong>{generatedReport.title}</strong> ({generatedReport.metrics?.length || 4} KPIs, {generatedReport.sections?.length || 3} Audit Findings, {generatedReport.recommendations?.length || 3} Strategic Directives)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                        CONFIDENTIAL
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="submit"
                          id="btn-send-stakeholder-email"
                          disabled={isSendingEmail || !currentRole.canExportReports}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {isSendingEmail ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Dispatching Report...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Report to Stakeholder</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          id="btn-mailto-fallback"
                          onClick={handleOpenMailto}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Open pre-filled draft in your desktop or web email client"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          <span>Open in Mail Client</span>
                        </button>
                      </div>

                      {sentHistory.length > 0 && (
                        <button
                          type="button"
                          id="btn-toggle-sent-history"
                          onClick={() => setShowHistory(prev => !prev)}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>Sent History ({sentHistory.length})</span>
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Dispatched History List */}
                  {showHistory && sentHistory.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Recent Session Dispatches
                      </span>
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {sentHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {item.recipient}
                              </span>
                              <span className="text-slate-400 text-[10px] font-mono">
                                #{item.messageId.slice(-6)}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[10px] shrink-0">
                              {new Date(item.dispatchedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Key Metrics Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {generatedReport.metrics?.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{m.label}</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Report Sections */}
              <div className="space-y-4 pt-1">
                {generatedReport.sections?.map((sec: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                      {sec.heading}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-950 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Actionable Strategic Recommendations</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {generatedReport.recommendations?.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Role: <strong className="text-slate-600 dark:text-slate-300">{currentRole.label}</strong>
            </span>
            {exportSuccess && (
              <span className="text-emerald-500 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                <span>{exportSuccess}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy Button */}
            <button
              id="btn-copy-report"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Email Report Button */}
            <button
              id="btn-email-report"
              onClick={() => {
                setIsEmailPanelOpen(prev => !prev);
                if (!emailSubject && generatedReport) {
                  setEmailSubject(`[ShoonyaAI Briefing] ${generatedReport.title}`);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
                isEmailPanelOpen
                  ? 'bg-indigo-700 text-white shadow-indigo-700/30 ring-2 ring-indigo-400/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
              title="Email report summary directly to a stakeholder"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isEmailPanelOpen ? 'Hide Email Form' : 'Email Report'}</span>
            </button>

            {/* Prominent Download as PDF Button */}
            <button
              id="btn-download-pdf"
              onClick={handleDownloadPDF}
              disabled={!currentRole.canExportReports || exportingFormat === 'pdf'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer"
              title="Generate and download client-side PDF document"
            >
              {exportingFormat === 'pdf' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Building PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download as PDF</span>
                </>
              )}
            </button>

            {/* Download as Excel Button */}
            <button
              id="btn-download-excel"
              onClick={handleDownloadExcel}
              disabled={!currentRole.canExportReports || exportingFormat === 'excel'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
              title="Download structured multi-sheet Excel spreadsheet (.xlsx)"
            >
              {exportingFormat === 'excel' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </>
              )}
            </button>

            {/* Download as HTML Button */}
            <button
              id="btn-download-html"
              onClick={handleDownloadHTML}
              disabled={!currentRole.canExportReports || exportingFormat === 'html'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-all cursor-pointer"
              title="Download standalone styled HTML document"
            >
              {exportingFormat === 'html' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Writing HTML...</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5" />
                  <span>HTML</span>
                </>
              )}
            </button>

            {/* Download Markdown */}
            <button
              id="btn-download-markdown"
              onClick={handleDownloadMarkdown}
              disabled={!currentRole.canExportReports || exportingFormat === 'md'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              title="Download raw markdown document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
