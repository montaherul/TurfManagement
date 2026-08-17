import pdfMake from 'pdfmake/build/pdfmake.js';
import * as pdfFonts from 'pdfmake/build/vfs_fonts.js';
import moment from 'moment';

pdfMake.vfs = pdfFonts;

const TIER_COLORS = {
  excellent: '#16a34a',
  good: '#84cc16',
  acceptable: '#eab308',
  poor: '#dc2626',
};

const label = (key) =>
  String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase());

/**
 * Builds a professional inspection report PDF (pdfmake).
 * Header: org / field / inspector · Score breakdown table · tier badge ·
 * recommendations · photos placeholder.
 */
export const buildInspectionPdf = (inspection) => {
  const org = inspection.organization || {};
  const field = inspection.field || {};
  const inspector = inspection.inspector || {};
  const score = inspection.pitchQualityScore || {};
  const tier = score.tier || 'poor';
  const tierColor = TIER_COLORS[tier] || '#6b7280';

  const recommendations = Array.isArray(inspection.recommendations)
    ? inspection.recommendations
    : inspection.recommendations && typeof inspection.recommendations === 'object'
      ? Object.entries(inspection.recommendations).map(([k, v]) => `${label(k)}: ${v}`)
      : [];

  const scoreRows = [
    ['Surface Condition', score.surfaceScore ?? '-', '20'],
    ['Soil Condition', score.soilScore ?? '-', '20'],
    ['Structural Condition', score.structuralScore ?? '-', '20'],
    ['Grass Health', score.grassScore ?? '-', '20'],
    ['Maintenance', score.maintenanceScore ?? '-', '15'],
    ['Pitch Quality Score', score.total ?? '-', '95'],
  ];

  const photoUrls = Array.isArray(inspection.photographs)
    ? inspection.photographs
    : inspection.photographs && typeof inspection.photographs === 'object'
      ? Object.values(inspection.photographs)
      : [];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    info: {
      title: `Inspection Report - ${field.name || inspection.id}`,
      author: 'TurfCare BD',
    },
    content: [
      {
        columns: [
          {
            text: [
              { text: 'TurfCare BD', style: 'brand' },
              { text: '\nInspection Report', style: 'title' },
            ],
          },
          {
            text: `Report ID: ${inspection.id}\nDate: ${moment(inspection.inspectionDate).format('DD MMM YYYY')}`,
            alignment: 'right',
            style: 'muted',
          },
        ],
        columnGap: 10,
      },
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 500, y2: 4, lineWidth: 1.5, lineColor: tierColor }] },
      { text: ' ', fontSize: 2 },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                table: {
                  widths: [110, '*'],
                  body: [
                    [{ text: 'Organization', style: 'cellLabel' }, { text: org.name || '-' }],
                    [{ text: 'Field', style: 'cellLabel' }, { text: `${field.name || '-'} (${field.fieldId || ''})` }],
                    [{ text: 'Field Type', style: 'cellLabel' }, { text: `${label(field.sportType)} · ${label(field.turfType)}` }],
                  ],
                },
                layout: 'noBorders',
              },
              {
                table: {
                  widths: [110, '*'],
                  body: [
                    [{ text: 'Inspector', style: 'cellLabel' }, { text: `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim() || '-' }],
                    [{ text: 'Inspector Email', style: 'cellLabel' }, { text: inspector.email || '-' }],
                    [{ text: 'Status', style: 'cellLabel' }, { text: label(inspection.status) }],
                  ],
                },
                layout: 'noBorders',
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
      { text: ' ', fontSize: 6 },
      {
        columns: [
          {
            text: 'Overall Assessment',
            style: 'section',
            width: 'auto',
          },
          {
            table: {
              widths: [70, 36],
              body: [
                [
                  { text: score.total ?? '-', alignment: 'center', bold: true, fontSize: 20, color: tierColor, border: [true, true, true, true] },
                  { text: tier.toUpperCase(), alignment: 'center', bold: true, fontSize: 10, color: 'white', fillColor: tierColor, border: [true, true, true, true] },
                ],
              ],
            },
            layout: 'noBorders',
            width: 130,
            alignment: 'right',
          },
        ],
      },
      { text: ' ', fontSize: 4 },
      { text: 'Score Breakdown', style: 'section' },
      {
        table: {
          widths: ['*', 90, 60],
          headerRows: 1,
          body: [
            [
              { text: 'Category', style: 'tableHeader' },
              { text: 'Score', style: 'tableHeader', alignment: 'center' },
              { text: 'Max', style: 'tableHeader', alignment: 'center' },
            ],
            ...scoreRows.map(([cat, val, max]) => [
              { text: cat },
              { text: val, alignment: 'center', bold: true },
              { text: max, alignment: 'center', color: '#6b7280' },
            ]),
          ],
        },
      },
      { text: ' ', fontSize: 8 },
      { text: 'Assessment Details', style: 'section' },
      ...renderAssessment('Weather Conditions', inspection.weatherConditions),
      ...renderAssessment('Surface Assessment', inspection.surfaceAssessment),
      ...renderAssessment('Soil Assessment', inspection.soilAssessment),
      ...renderAssessment('Structural Assessment', inspection.structuralAssessment),
      ...renderAssessment('Grass Health', inspection.grassHealth),
      { text: ' ', fontSize: 8 },
      { text: 'Recommendations', style: 'section' },
      recommendations.length
        ? {
            ul: recommendations.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))),
            style: 'body',
          }
        : { text: 'No recommendations recorded.', style: 'muted' },
      { text: ' ', fontSize: 8 },
      { text: 'Photographs', style: 'section' },
      photoUrls.length
        ? {
            columns: photoUrls.slice(0, 4).map((url) => ({
              image: url,
              width: 100,
              height: 75,
              margin: [0, 0, 8, 0],
            })),
          }
        : { text: 'No photographs attached. (placeholder)', style: 'muted' },
      { text: ' ', fontSize: 14 },
      {
        text: `Generated by TurfCare BD on ${moment().format('DD MMM YYYY, hh:mm A')}`,
        style: 'muted',
        alignment: 'center',
        fontSize: 8,
      },
    ],
    styles: {
      brand: { fontSize: 18, bold: true, color: '#047857' },
      title: { fontSize: 14, color: '#374151', margin: [0, 2, 0, 0] },
      section: { fontSize: 12, bold: true, color: '#111827', margin: [0, 8, 0, 4] },
      body: { fontSize: 10, margin: [0, 1, 0, 1] },
      muted: { fontSize: 9, color: '#6b7280' },
      cellLabel: { bold: true, color: '#374151', fontSize: 9 },
      tableHeader: { bold: true, color: '#ffffff', fillColor: '#065f46', fontSize: 10 },
    },
  };

  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
      try {
        resolve(Buffer.from(buffer));
      } catch (err) {
        reject(err);
      }
    });
  });
};

export const buildInvoicePdf = ({ invoice, organization = {} }) => {
  const paidAt = invoice.paidAt || invoice.createdAt;
  const paymentMethod = invoice.paymentMethod || {};
  const methodLabel = paymentMethod.cardType ? String(paymentMethod.cardType) : 'SSLCommerz';
  const amount = Number(invoice.amountBDT || 0);
  const currency = invoice.currency || 'BDT';
  const fmt = (n) => `${currency} ${Number(n || 0).toLocaleString('en-US')}`;

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    info: {
      title: `Invoice ${invoice.invoiceNo} - ${organization.name || 'TurfCare BD'}`,
      author: 'TurfCare BD',
    },
    content: [
      {
        columns: [
          {
            text: [
              { text: 'TurfCare BD', style: 'brand' },
              { text: `\n${organization.name || ''}\nEnterprise Turf Management Platform`, style: 'muted' },
            ],
          },
          {
            columns: [
              { text: '', width: '*', layout: 'noBorders' },
              {
                table: {
                  widths: ['auto'],
                  body: [[{ text: 'PAID', alignment: 'center', bold: true, fontSize: 11, color: 'white', fillColor: '#16a34a', margin: [6, 4, 6, 4] }]],
                },
                layout: 'noBorders',
                width: 'auto',
              },
            ],
            alignment: 'right',
          },
        ],
        columnGap: 10,
      },
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 500, y2: 4, lineWidth: 1.5, lineColor: '#047857' }] },
      { text: ' ', fontSize: 6 },
      {
        columns: [
          { text: 'INVOICE', style: 'section', fontSize: 18 },
          { text: invoice.invoiceNo || '', alignment: 'right', bold: true, fontSize: 13, color: '#111827' },
        ],
      },
      { text: ' ', fontSize: 4 },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                table: {
                  widths: [90, '*'],
                  body: [
                    [{ text: 'Bill To', style: 'cellLabel', bold: true, color: '#047857' }, ''],
                    [{ text: 'Organization', style: 'cellLabel' }, { text: organization.name || '-' }],
                    [{ text: 'Email', style: 'cellLabel' }, { text: invoice.billToEmail || '-' }],
                  ],
                },
                layout: 'noBorders',
              },
              {
                table: {
                  widths: [90, '*'],
                  body: [
                    [{ text: 'Invoice Date', style: 'cellLabel' }, { text: moment(invoice.createdAt).format('DD MMM YYYY') }],
                    [{ text: 'Payment Date', style: 'cellLabel' }, { text: moment(paidAt).format('DD MMM YYYY') }],
                    [{ text: 'Payment Method', style: 'cellLabel' }, { text: methodLabel }],
                  ],
                },
                layout: 'noBorders',
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
      { text: ' ', fontSize: 10 },
      {
        table: {
          widths: ['*', 50, 90, 90],
          headerRows: 1,
          body: [
            [
              { text: 'Description', style: 'tableHeader' },
              { text: 'Qty', style: 'tableHeader', alignment: 'center' },
              { text: 'Price', style: 'tableHeader', alignment: 'right' },
              { text: 'Amount', style: 'tableHeader', alignment: 'right' },
            ],
            [
              { text: `TurfCare BD ${invoice.planName || invoice.planId} plan - 1 month subscription` },
              { text: '1', alignment: 'center' },
              { text: fmt(amount), alignment: 'right' },
              { text: fmt(amount), alignment: 'right', bold: true },
            ],
          ],
        },
      },
      { text: ' ', fontSize: 6 },
      {
        table: {
          widths: ['*', 90],
          body: [
            [{ text: 'Subtotal', alignment: 'right' }, { text: fmt(amount), alignment: 'right' }],
            [{ text: 'Tax', alignment: 'right' }, { text: fmt(0), alignment: 'right' }],
            [{ text: 'Discount', alignment: 'right' }, { text: fmt(0), alignment: 'right' }],
            [{ text: 'TOTAL', bold: true, fontSize: 12, alignment: 'right' }, { text: fmt(amount), bold: true, fontSize: 12, alignment: 'right' }],
          ],
        },
        layout: 'noBorders',
      },
      { text: ' ', fontSize: 10 },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Payment Status', bold: true }, { text: 'PAID', bold: true, color: '#16a34a' }],
            [{ text: 'Transaction ID', bold: true }, { text: invoice.tranId || '-' }],
          ],
        },
        layout: 'lightHorizontalLines',
      },
      { text: ' ', fontSize: 14 },
      { text: 'Thank you for your payment!', alignment: 'center', bold: true, fontSize: 12, color: '#047857' },
      { text: ' ', fontSize: 12 },
      {
        text: `Generated by TurfCare BD on ${moment().format('DD MMM YYYY, hh:mm A')} · For support contact support@turfcarebd.com`,
        style: 'muted',
        alignment: 'center',
        fontSize: 8,
      },
    ],
    styles: {
      brand: { fontSize: 18, bold: true, color: '#047857' },
      section: { fontSize: 14, bold: true, color: '#111827' },
      muted: { fontSize: 9, color: '#6b7280' },
      cellLabel: { bold: true, color: '#374151', fontSize: 9 },
      tableHeader: { bold: true, color: '#ffffff', fillColor: '#065f46', fontSize: 10 },
    },
  };

  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
      try {
        resolve(Buffer.from(buffer));
      } catch (err) {
        reject(err);
      }
    });
  });
};

const renderAssessment = (title, data) => {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return [
      { text: title, style: 'body', bold: true, margin: [0, 2, 0, 0] },
      { text: '—', style: 'muted', fontSize: 9 },
    ];
  }
  return [
    { text: title, style: 'body', bold: true, margin: [0, 2, 0, 0] },
    {
      table: {
        widths: ['*', '*'],
        body: chunk(Object.entries(data), 2).map((pair) => {
          const cells = pair.map(([k, v]) => [
            { text: label(k), style: 'cellLabel' },
            { text: typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-') },
          ]);
          while (cells.length < 2) {
            cells.push([{ text: '' }, { text: '' }]);
          }
          return cells;
        }),
      },
      layout: 'lightHorizontalLines',
    },
  ];
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default buildInspectionPdf;