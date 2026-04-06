const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TableOfContents, Bookmark
} = require("docx");

// ── Helpers ──
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "2E75B6" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function headerCell(text, width) {
  return new TableCell({
    borders: headerBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 20 })] })]
  });
}

function cell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20 })] })]
  });
}

function cellBold(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 20 })] })]
  });
}

function cellLink(text, url, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new ExternalHyperlink({
        children: [new TextRun({ text, style: "Hyperlink", font: "Arial", size: 20 })],
        link: url
      })]
    })]
  });
}

function spacer(h = 120) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1A1A2E" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "404040" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "steps",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "Step %1:", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 720 } } }
        }]
      }
    ]
  },
  sections: [
    // ═══════════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        spacer(2400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u5317\u4eac\u5730\u94c1\u00b7\u5168\u7f51\u5b9e\u65f6\u6a21\u62df", font: "Arial", size: 56, bold: true, color: "1A1A2E" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Beijing Subway Real-Time Simulation", font: "Arial", size: 32, color: "666666" })]
        }),
        spacer(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u4ea7\u54c1\u6587\u6863", font: "Arial", size: 36, bold: true, color: "2E75B6" })]
        }),
        spacer(600),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u7248\u672c\uff1av1.0.0", font: "Arial", size: 22, color: "888888" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: "\u65e5\u671f\uff1a2026\u5e744\u67084\u65e5", font: "Arial", size: 22, color: "888888" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: "\u4f5c\u8005\uff1awonders2002ok", font: "Arial", size: 22, color: "888888" })]
        }),
        spacer(1200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ExternalHyperlink({
            children: [new TextRun({ text: "https://wonders2002ok.github.io/beijing_realtime_subway_map/", style: "Hyperlink", font: "Arial", size: 22 })],
            link: "https://wonders2002ok.github.io/beijing_realtime_subway_map/"
          })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60 },
          children: [new TextRun({ text: "GitHub: wonders2002ok/beijing_realtime_subway_map", font: "Arial", size: 20, color: "999999" })]
        }),
      ]
    },

    // ═══════════════════════════════════════════════
    // TOC + MAIN CONTENT
    // ═══════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: "\u5317\u4eac\u5730\u94c1\u00b7\u5168\u7f51\u5b9e\u65f6\u6a21\u62df \u2014 \u4ea7\u54c1\u6587\u6863", font: "Arial", size: 18, color: "AAAAAA" })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "\u7b2c ", font: "Arial", size: 18, color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "AAAAAA" }),
              new TextRun({ text: " \u9875 / \u5171 ", font: "Arial", size: 18, color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: "AAAAAA" }),
              new TextRun({ text: " \u9875", font: "Arial", size: 18, color: "AAAAAA" })
            ]
          })]
        })
      },
      children: [
        // ── TOC ──
        new TableOfContents("\u76ee\u5f55", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════
        // 1. 产品概述
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "ch1", children: [new TextRun("1. \u4ea7\u54c1\u6982\u8ff0")] })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 \u4ea7\u54c1\u5b9a\u4f4d")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u201c\u5317\u4eac\u5730\u94c1\u00b7\u5168\u7f51\u5b9e\u65f6\u6a21\u62df\u201d\u662f\u4e00\u6b3e\u57fa\u4e8e\u5217\u8f66\u65f6\u523b\u8868\u6570\u636e\u7684\u5317\u4eac\u5730\u94c1\u5168\u7f51\u8fd0\u884c\u72b6\u6001\u53ef\u89c6\u5316\u5de5\u5177\u3002\u5b83\u901a\u8fc7\u5bf9\u771f\u5b9e\u65f6\u523b\u8868\u6570\u636e\u7684\u89e3\u6790\u548c\u63a8\u7b97\uff0c\u5728\u5730\u56fe\u4e0a\u5b9e\u65f6\u5c55\u793a\u5317\u4eac\u5730\u94c1 28 \u6761\u7ebf\u8def\u3001 539 \u4e2a\u7ad9\u70b9\u4e0a\u6bcf\u4e00\u8f86\u5217\u8f66\u7684\u4f4d\u7f6e\u3001\u884c\u9a76\u65b9\u5411\u548c\u8fd0\u884c\u72b6\u6001\u3002\u672c\u9879\u76ee\u4e3a\u5730\u94c1\u7231\u597d\u8005\u3001\u57ce\u5e02\u89c4\u5212\u7814\u7a76\u4eba\u5458\u4ee5\u53ca\u666e\u901a\u4e58\u5ba2\u63d0\u4f9b\u4e86\u4e00\u4e2a\u76f4\u89c2\u3001\u6f02\u4eae\u7684\u5168\u7f51\u8fd0\u884c\u72b6\u6001\u4e00\u89c8\u5de5\u5177\u3002",
            font: "Arial", size: 22
          })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 \u6838\u5fc3\u4ef7\u503c")] }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u5168\u7f51\u8986\u76d6\uff1a\u8986\u76d6\u5317\u4eac\u5730\u94c1\u6240\u6709 28 \u6761\u8fd0\u8425\u7ebf\u8def\uff0c\u5305\u62ec\u5730\u94c1 1-19 \u53f7\u7ebf\u3001\u623f\u5c71\u7ebf\u3001\u4ea6\u5e84\u7ebf\u3001\u71d5\u623f\u7ebf\u3001\u660c\u5e73\u7ebf\u3001S1 \u7ebf\u3001\u897f\u90ca\u7ebf\u3001\u4ea6\u5e84 T1 \u7ebf\u3001\u9996\u90fd\u673a\u573a\u7ebf\u3001\u5927\u5174\u673a\u573a\u7ebf", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u7cbe\u786e\u5230\u79d2\uff1a\u6bcf\u8f86\u5217\u8f66\u7684\u4f4d\u7f6e\u57fa\u4e8e\u65f6\u523b\u8868\u63a8\u7b97\uff0c\u7cbe\u786e\u5230\u79d2\u7ea7\uff0c\u5e76\u901a\u8fc7\u5e27\u7ea7\u63d2\u503c\u5b9e\u73b0\u5e73\u6ed1\u79fb\u52a8\u52a8\u753b", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u96f6\u90e8\u7f72\u4f53\u9a8c\uff1a\u751f\u6210\u5355\u4e00 HTML \u6587\u4ef6\uff0c\u65e0\u9700\u670d\u52a1\u5668\uff0c\u6253\u5f00\u6d4f\u89c8\u5668\u5373\u53ef\u8fd0\u884c\uff0c\u4e5f\u53ef\u901a\u8fc7 GitHub Pages \u4e00\u952e\u90e8\u7f72\u5230\u516c\u7f51", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u591a\u573a\u666f\u6a21\u62df\uff1a\u652f\u6301\u5b9e\u65f6\u3001\u65e9\u9ad8\u5cf0\u3001\u5e73\u5cf0\u3001\u665a\u9ad8\u5cf0\u7b49\u591a\u79cd\u8fd0\u8425\u573a\u666f\uff0c\u5e76\u53ef 1x - 300x \u53d8\u901f\u64ad\u653e", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 \u5728\u7ebf\u8bbf\u95ee")] }),
        new Paragraph({
          children: [new ExternalHyperlink({
            children: [new TextRun({ text: "https://wonders2002ok.github.io/beijing_realtime_subway_map/index.html", style: "Hyperlink", font: "Arial", size: 22 })],
            link: "https://wonders2002ok.github.io/beijing_realtime_subway_map/index.html"
          })]
        }),
        new Paragraph({
          spacing: { before: 60 },
          children: [new TextRun({ text: "\u4e5f\u53ef\u4ee5\u76f4\u63a5\u4e0b\u8f7d\u9879\u76ee\u4e2d\u7684 index.html \u6587\u4ef6\uff0c\u5728\u672c\u5730\u6d4f\u89c8\u5668\u4e2d\u6253\u5f00\u5373\u53ef\u4f7f\u7528\u3002", font: "Arial", size: 22, color: "666666" })]
        }),

        // ═══════════════════════════════════════════════
        // 2. 功能特性
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. \u529f\u80fd\u7279\u6027")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 \u5168\u7f51\u7ebf\u8def\u8986\u76d6")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u672c\u9879\u76ee\u5b8c\u6574\u8986\u76d6\u5317\u4eac\u5730\u94c1\u5168\u90e8 28 \u6761\u8fd0\u8425\u7ebf\u8def\u548c 539 \u4e2a\u7ad9\u70b9\uff0c\u5177\u4f53\u5305\u62ec\uff1a",
            font: "Arial", size: 22
          })]
        }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [4513, 4513],
          rows: [
            new TableRow({ children: [headerCell("\u7c7b\u522b", 4513), headerCell("\u7ebf\u8def", 4513)] }),
            new TableRow({ children: [cellBold("\u5e72\u7ebf\u5730\u94c1", 4513), cell("1-19 \u53f7\u7ebf", 4513)] }),
            new TableRow({ children: [cellBold("\u5e73\u884c\u7ebf\u8def", 4513), cell("\u623f\u5c71\u7ebf\u3001\u4ea6\u5e84\u7ebf\u3001\u71d5\u623f\u7ebf\u3001\u660c\u5e73\u7ebf", 4513)] }),
            new TableRow({ children: [cellBold("\u7279\u6b8a\u7ebf\u8def", 4513), cell("S1 \u7ebf\uff08\u78c1\u60ac\u6d6e\uff09\u3001\u897f\u90ca\u7ebf\uff08\u6709\u8f68\u7535\u8f66\uff09\u3001\u4ea6\u5e84 T1 \u7ebf\uff08\u6709\u8f68\u7535\u8f66\uff09", 4513)] }),
            new TableRow({ children: [cellBold("\u673a\u573a\u7ebf\u8def", 4513), cell("\u9996\u90fd\u673a\u573a\u7ebf\u3001\u5927\u5174\u673a\u573a\u7ebf", 4513)] }),
            new TableRow({ children: [cellBold("\u73af\u7ebf", 4513), cell("2 \u53f7\u7ebf\u300110 \u53f7\u7ebf\uff08\u652f\u6301\u5faa\u73af\u8fd0\u884c\u6a21\u62df\uff09", 4513)] }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 \u5217\u8f66\u5b9e\u65f6\u6a21\u62df")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u57fa\u4e8e\u771f\u5b9e\u5217\u8f66\u65f6\u523b\u8868\u6570\u636e\u8fdb\u884c\u63a8\u7b97\uff0c\u6bcf\u8f86\u5217\u8f66\u7684\u4f4d\u7f6e\u7cbe\u786e\u5230\u79d2\u3002\u7cfb\u7edf\u901a\u8fc7\u4ee5\u4e0b\u7b97\u6cd5\u5b9e\u73b0\u5217\u8f66\u4f4d\u7f6e\u7684\u5b9e\u65f6\u8ba1\u7b97\uff1a",
            font: "Arial", size: 22
          })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u6839\u636e\u5f53\u524d\u65f6\u95f4\u81ea\u52a8\u5224\u65ad\u5de5\u4f5c\u65e5/\u53cc\u4f11\u65e5\uff0c\u52a0\u8f7d\u5bf9\u5e94\u7684\u65f6\u523b\u8868", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u901a\u8fc7\u4e8c\u5206\u67e5\u627e\u5b9a\u4f4d\u5217\u8f66\u5f53\u524d\u6240\u5728\u7684\u7ad9\u95f4\u533a\u95f4", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u4f7f\u7528\u79d2\u7ea7\u65f6\u95f4\u6233\u8fdb\u884c\u5e73\u6ed1\u63d2\u503c\uff0c\u8ba1\u7b97\u7ad9\u95f4\u8fdb\u5ea6\u6bd4\u4f8b\uff08progress ratio\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u5bf9\u7ebf\u6027\u63d2\u503c\u5f97\u5230\u5217\u8f66\u5728\u5730\u56fe\u4e0a\u7684\u7cbe\u786e\u5750\u6807", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 \u53ef\u89c6\u5316\u4e0e\u4ea4\u4e92")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("\u5730\u56fe\u5c42")] }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u5e95\u56fe\u670d\u52a1\uff1a\u4f7f\u7528\u9ad8\u5fb7\u5730\u56fe\u74e6\u7247\u670d\u52a1\uff08GCJ-02 \u5750\u6807\u7cfb\uff09\uff0c\u7ad9\u70b9\u5750\u6807\u4e0e\u5e95\u56fe\u5929\u7136\u5bf9\u9f50", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u663c\u591c\u81ea\u52a8\u5207\u6362\uff1a22:00 - 7:00 \u81ea\u52a8\u5207\u6362\u4e3a\u536b\u661f\u5f71\u50cf\u5e95\u56fe + \u964d\u4eae\u6ee4\u955c\uff1b\u767d\u5929\u4f7f\u7528\u77e2\u91cf\u6807\u51c6\u5730\u56fe", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u7f29\u653e\u4e0e\u62d6\u62fd\uff1a\u652f\u6301 Leaflet.js \u6807\u51c6\u5730\u56fe\u64cd\u4f5c\uff0c\u53ef\u81ea\u7531\u7f29\u653e\u548c\u62d6\u62fd\u6d4f\u89c8", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("\u7ebf\u8def\u4e0e\u7ad9\u70b9")] }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u7ebf\u8def\u663e\u793a\uff1a\u6bcf\u6761\u7ebf\u8def\u4ee5\u5176\u5b98\u65b9\u6807\u8bc6\u8272\u5f69\u7ed8\u5236\uff0c\u7ebf\u5bbd 5px\uff0c\u73af\u7ebf\u81ea\u52a8\u95ed\u5408", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u6362\u4e58\u7ad9\u8bc6\u522b\uff1a\u591a\u7ebf\u8def\u4ea4\u6c47\u7ad9\u70b9\u81ea\u52a8\u8bc6\u522b\u5e76\u653e\u5927\u663e\u793a\uff0c\u60ac\u505c\u65f6\u5c55\u793a\u6240\u6709\u7ebf\u8def\u6807\u8bc6", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u7ad9\u70b9\u5f39\u7a97\uff1a\u9f20\u6807\u60ac\u505c\u5728\u7ad9\u70b9\u4e0a\u663e\u793a\u7ad9\u540d\u53ca\u6240\u5c5e\u7ebf\u8def\u4fe1\u606f", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("\u5217\u8f66\u56fe\u6807")] }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u4e09\u89d2\u5f62\u65b9\u5411\u6307\u793a\uff1a\u5217\u8f66\u56fe\u6807\u4e3a\u5f69\u8272\u4e09\u89d2\u5f62\uff0c\u5c16\u89d2\u6307\u5411\u5217\u8f66\u884c\u9a76\u65b9\u5411\uff0c\u65b9\u5411\u57fa\u4e8e\u5730\u7406\u65b9\u4f4d\u89d2\u8ba1\u7b97", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u5217\u8f66\u60ac\u505c\uff1a\u663e\u793a\u884c\u9a76\u65b9\u5411\u3001\u8d77\u59cb\u7ad9\u3001\u76ee\u6807\u7ad9\u3001\u9884\u8ba1\u5230\u8fbe\u65f6\u95f4\u53ca\u6240\u5c5e\u7ebf\u8def", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u989c\u8272\u533a\u5206\uff1a\u6bcf\u8f86\u5217\u8f66\u989c\u8272\u4e0e\u6240\u5c5e\u7ebf\u8def\u989c\u8272\u4e00\u81f4\uff0c\u4fbf\u4e8e\u8bc6\u522b", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.4 \u63a7\u5236\u9762\u677f")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u5de6\u4e0a\u89d2\u63a7\u5236\u9762\u677f\u63d0\u4f9b\u4e30\u5bcc\u7684\u4fe1\u606f\u548c\u4ea4\u4e92\u529f\u80fd\uff1a",
            font: "Arial", size: 22
          })]
        }),

        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 7026],
          rows: [
            new TableRow({ children: [headerCell("\u529f\u80fd\u6a21\u5757", 2000), headerCell("\u8bf4\u660e", 7026)] }),
            new TableRow({ children: [cellBold("\u65f6\u949f\u663e\u793a", 2000), cell("\u663e\u793a\u5f53\u524d\u6a21\u62df\u65f6\u95f4\uff08\u7cbe\u786e\u5230\u79d2\uff09\u3001\u65e5\u671f\u548c\u661f\u671f", 7026)] }),
            new TableRow({ children: [cellBold("\u7edf\u8ba1\u9762\u677f", 2000), cell("\u5b9e\u65f6\u663e\u793a\u5f53\u524d\u53ef\u89c1\u7ebf\u8def\u6570\u548c\u5728\u7ebf\u5217\u8f66\u603b\u6570", 7026)] }),
            new TableRow({ children: [cellBold("\u7ebf\u8def\u56fe\u4f8b", 2000), cell("\u5782\u76f4\u5217\u8868\u5f62\u5f0f\u5c55\u793a\u6bcf\u6761\u7ebf\u8def\uff0c\u663e\u793a\u7ebf\u8def\u540d\u79f0\u3001\u6807\u8bc6\u8272\u53ca\u5404\u65b9\u5411\u5728\u7ebf\u5217\u8f66\u6570\uff08\u5982\u201c\u4e1c\u884c 5 \u00b7 \u897f\u884c 3\u201d\uff09", 7026)] }),
            new TableRow({ children: [cellBold("\u7ebf\u8def\u7b5b\u9009", 2000), cell("\u70b9\u51fb\u7ebf\u8def\u56fe\u4f8b\u9879\u53ef\u663e\u793a/\u9690\u85cf\u5bf9\u5e94\u7ebf\u8def\u53ca\u5176\u5217\u8f66\uff0c\u65b9\u4fbf\u805a\u7126\u5173\u6ce8\u7279\u5b9a\u7ebf\u8def", 7026)] }),
            new TableRow({ children: [cellBold("\u8fd0\u8425\u6a21\u5f0f", 2000), cell("\u63d0\u4f9b\u5b9e\u65f6\u3001\u65e9\u9ad8\u5cf0\uff0808:00\uff09\u3001\u5e73\u5cf0\uff0813:00\uff09\u3001\u665a\u9ad8\u5cf0\uff0818:00\uff09\u56db\u79cd\u9884\u8bbe\u6a21\u5f0f", 7026)] }),
            new TableRow({ children: [cellBold("\u901f\u5ea6\u8c03\u8282", 2000), cell("1x - 300x \u53d8\u901f\u63a7\u5236\uff0c\u53ef\u5feb\u901f\u56de\u653e\u6574\u5929\u7684\u8fd0\u884c\u60c5\u51b5", 7026)] }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.5 \u591a\u65e5\u671f\u652f\u6301")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u7cfb\u7edf\u81ea\u52a8\u6839\u636e\u6a21\u62df\u65f6\u95f4\u7684\u661f\u671f\u5224\u65ad\u52a0\u8f7d\u76f8\u5e94\u7684\u65f6\u523b\u8868\uff1a\u5de5\u4f5c\u65e5\uff08\u5468\u4e00\u81f3\u5468\u4e94\uff09\u52a0\u8f7d\u5de5\u4f5c\u65e5\u65f6\u523b\u8868\uff0c\u53cc\u4f11\u65e5\uff08\u5468\u516d\u3001\u5468\u65e5\uff09\u52a0\u8f7d\u53cc\u4f11\u65e5\u65f6\u523b\u8868\u3002\u539f\u59cb\u6570\u636e\u4e2d\u7684\u591a\u79cd\u65e5\u671f\u5206\u7ec4\uff08\u5982\u5168\u65e5\u3001\u5e73\u5e38\u65e5\u3001\u5e73\u65e5\u3001\u91cd\u70b9\u4fdd\u969c\u7b49\uff09\u4f1a\u88ab\u667a\u80fd\u6620\u5c04\u5230\u5de5\u4f5c\u65e5\u6216\u53cc\u4f11\u65e5\u3002",
            font: "Arial", size: 22
          })]
        }),

        // ═══════════════════════════════════════════════
        // 3. 技术架构
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. \u6280\u672f\u67b6\u6784")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 \u6574\u4f53\u67b6\u6784")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u9879\u76ee\u91c7\u7528\u201c\u6784\u5efa\u65f6\u6570\u636e\u5d4c\u5165 + \u7eaf\u524d\u7aef\u8fd0\u884c\u201d\u7684\u67b6\u6784\uff0c\u65e0\u9700\u540e\u7aef\u670d\u52a1\u5668\u3002\u6784\u5efa\u9636\u6bb5\u901a\u8fc7 Python \u811a\u672c\u89e3\u6790\u539f\u59cb\u6570\u636e\u5e76\u5d4c\u5165\u5230 HTML \u6a21\u677f\u4e2d\uff0c\u751f\u6210\u7684 index.html \u662f\u4e00\u4e2a\u5305\u542b\u6240\u6709\u6570\u636e\u548c\u903b\u8f91\u7684\u5355\u6587\u4ef6\uff0c\u53ef\u76f4\u63a5\u5728\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\u3002",
            font: "Arial", size: 22
          })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 \u6280\u672f\u6808\u603b\u89c8")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 7026],
          rows: [
            new TableRow({ children: [headerCell("\u7ec4\u4ef6", 2000), headerCell("\u6280\u672f", 7026)] }),
            new TableRow({ children: [cell("\u524d\u7aef\u5730\u56fe", 7026), cell("Leaflet.js 1.9.4 + \u539f\u751f JavaScript\uff08ES6+\uff09", 7026)] }),
            new TableRow({ children: [cell("\u5730\u56fe\u5e95\u56fe", 7026), cell("\u9ad8\u5fb7\u5730\u56fe\u74e6\u7247\u670d\u52a1\uff08\u77e2\u91cf / \u536b\u661f\uff09", 7026)] }),
            new TableRow({ children: [cell("\u6784\u5efa\u5de5\u5177", 7026), cell("Python 3 + pyjson5 \u5e93", 7026)] }),
            new TableRow({ children: [cell("\u65f6\u523b\u8868\u6570\u636e", 7026), cell("Beijing-Subway-Tools\uff08JSON5 \u683c\u5f0f\uff0cdelta \u538b\u7f29\u7f16\u7801\uff09", 7026)] }),
            new TableRow({ children: [cell("\u5750\u6807\u6570\u636e", 7026), cell("\u9ad8\u5fb7\u5730\u56fe GCJ-02 \u5750\u6807\u7cfb + \u624b\u52a8\u8865\u5145\u5750\u6807", 7026)] }),
            new TableRow({ children: [cell("\u90e8\u7f72\u65b9\u5f0f", 7026), cell("GitHub Pages\uff08\u9759\u6001\u6258\u7ba1\uff0c\u96f6\u6210\u672c\uff09", 7026)] }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 \u6784\u5efa\u6d41\u7a0b")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u6784\u5efa\u6d41\u7a0b\u5206\u4e3a\u4ee5\u4e0b\u6b65\u9aa4\uff1a",
            font: "Arial", size: 22
          })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u52a0\u8f7d\u9ad8\u5fb7\u5730\u56fe\u7ad9\u70b9\u5750\u6807\u6570\u636e\uff08amap_beijing.json\uff09\uff0c\u89e3\u6790\u4e3a\u7ad9\u540d \u2192 \u7ecf\u7eac\u5ea6\u7684\u6620\u5c04\u8868", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u5408\u5e76\u624b\u52a8\u8865\u5145\u5750\u6807\uff08\u5982\u4ea6\u5e84 T1 \u7ebf\u7ad9\u70b9\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u904d\u5386 28 \u4e2a JSON5 \u65f6\u523b\u8868\u6587\u4ef6\uff0c\u89e3\u6790\u7ebf\u8def\u4fe1\u606f\u3001\u7ad9\u70b9\u3001\u65b9\u5411\u3001\u65e5\u671f\u5206\u7ec4\u548c\u65f6\u523b\u8868", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u5c55\u5f00 delta \u538b\u7f29\u7f16\u7801\u7684\u53d1\u8f66\u65f6\u95f4\u4e3a\u5b8c\u6574\u65f6\u95f4\u5217\u8868\uff0c\u5e76\u8f6c\u6362\u4e3a\u5206\u949f\u6574\u6570", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u5c06\u65e5\u671f\u5206\u7ec4\uff08\u5168\u65e5/\u5e73\u5e38\u65e5/\u5e73\u65e5\u7b49\uff09\u6620\u5c04\u4e3a\u201c\u5de5\u4f5c\u65e5\u201d/\u201c\u53cc\u4f11\u65e5\u201d", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u4e3a\u6bcf\u4e2a\u7ad9\u70b9\u5339\u914d\u9ad8\u5fb7\u5750\u6807\uff08\u542b\u6a21\u7cca\u5339\u914d\u548c\u91cd\u540d\u7ad9\u70b9\u504f\u79fb\u5904\u7406\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u5c06\u6240\u6709\u6570\u636e\u5e8f\u5217\u5316\u4e3a JSON\uff0c\u6ce8\u5165\u5230 HTML \u6a21\u677f\u7684 __LINES__ \u5360\u4f4d\u7b26", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u8f93\u51fa index.html\uff08\u7ea6 1.8 MB\uff09\uff0c\u5305\u542b\u5168\u90e8\u6570\u636e + \u524d\u7aef\u4ee3\u7801", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.4 \u524d\u7aef\u8fd0\u884c\u65f6\u67b6\u6784")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u524d\u7aef\u91c7\u7528 requestAnimationFrame \u4e3b\u5faa\u73af\u9a71\u52a8\uff0c\u5b9e\u73b0\u9ad8\u6548\u7684\u5b9e\u65f6\u6e32\u67d3\uff1a",
            font: "Arial", size: 22
          })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u6bcf\u5e27\u66f4\u65b0\u65f6\u949f\u3001\u68c0\u67e5\u663c\u591c\u6a21\u5f0f\u5207\u6362", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u65b0\u5206\u949f\u5230\u8fbe\u65f6\uff1a\u5168\u91cf\u91cd\u7b97\uff08\u5904\u7406\u65b0\u53d1\u8f66/\u5230\u7ad9\u5217\u8f66\u7684\u589e\u51cf\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u540c\u4e00\u5206\u949f\u5185\uff1a\u4ec5\u91cd\u65b0\u5b9a\u4f4d\u5df2\u6709\u5217\u8f66\u6807\u8bb0\uff08\u5e73\u6ed1\u63d2\u503c\u52a8\u753b\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u5217\u8f66\u6807\u8bb0\u91c7\u7528 SVG \u4e09\u89d2\u5f62 + Base64 \u7f16\u7801\uff0c\u901a\u8fc7 CSS transform \u65cb\u8f6c\u5b9e\u73b0\u65b9\u5411\u6307\u793a", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.5 \u9879\u76ee\u76ee\u5f55\u7ed3\u6784")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [headerCell("\u8def\u5f84", 2500), headerCell("\u8bf4\u660e", 6526)] }),
            new TableRow({ children: [cell("index.html", 2500), cell("\u6784\u5efa\u8f93\u51fa\uff0c\u53ef\u76f4\u63a5\u6253\u5f00 / GitHub Pages \u90e8\u7f72\uff08\u7ea6 1.8 MB\uff09", 6526)] }),
            new TableRow({ children: [cell("template.html", 2500), cell("HTML \u6a21\u677f\u6587\u4ef6\uff0c\u5305\u542b\u5168\u90e8\u524d\u7aef\u4ee3\u7801\u548c\u6837\u5f0f\uff08\u7ea6 25 KB\uff09", 6526)] }),
            new TableRow({ children: [cell("data/amap_beijing.json", 2500), cell("\u9ad8\u5fb7\u5730\u56fe\u7ad9\u70b9\u5750\u6807\u6570\u636e\u5e93\uff08GCJ-02\uff0c\u7ea6 216 KB\uff09", 6526)] }),
            new TableRow({ children: [cell("scripts/build.py", 2500), cell("Python \u6784\u5efa\u811a\u672c\uff0c\u89e3\u6790 JSON5 \u65f6\u523b\u8868\u5e76\u751f\u6210 index.html", 6526)] }),
            new TableRow({ children: [cell("README.md", 2500), cell("\u9879\u76ee\u8bf4\u660e\u6587\u6863", 6526)] }),
          ]
        }),

        // ═══════════════════════════════════════════════
        // 4. 数据来源
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. \u6570\u636e\u6765\u6e90")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 \u65f6\u523b\u8868\u6570\u636e")] }),
        new Paragraph({
          children: [
            new TextRun({ text: "\u5217\u8f66\u65f6\u523b\u8868\u3001\u7ebf\u8def\u7ad9\u70b9\u7b49\u6838\u5fc3\u6570\u636e\u6765\u6e90\u4e8e ", font: "Arial", size: 22 }),
            new ExternalHyperlink({
              children: [new TextRun({ text: "Beijing-Subway-Tools", style: "Hyperlink", font: "Arial", size: 22 })],
              link: "https://github.com/Mick235711/Beijing-Subway-Tools"
            }),
            new TextRun({ text: "\uff08MIT License\uff09\uff0c\u5305\u542b\uff1a", font: "Arial", size: 22 })
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "JSON5 \u683c\u5f0f\u65f6\u523b\u8868\uff0c\u91c7\u7528 delta \u538b\u7f29\u7f16\u7801\u8282\u7701\u5b58\u50a8\u7a7a\u95f4", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u591a\u4ea4\u8def\u652f\u6301\uff08\u5168\u7a0b\u8f66 / \u5feb\u8f66\u7b49\u4e0d\u540c\u8fd0\u884c\u8def\u7ebf\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u5de5\u4f5c\u65e5 / \u53cc\u4f11\u65e5 / \u5168\u65e5\u7b49\u591a\u79cd\u65e5\u671f\u5206\u7ec4\u652f\u6301", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 \u5730\u56fe\u4e0e\u5750\u6807\u6570\u636e")] }),
        new Paragraph({
          children: [
            new TextRun({ text: "\u4f7f\u7528\u9ad8\u5fb7\u5730\u56fe\u74e6\u7247\u670d\u52a1\uff08GCJ-02 \u5750\u6807\u7cfb\uff09\u4f5c\u4e3a\u5e95\u56fe\uff0c\u7ad9\u70b9\u5750\u6807\u6765\u6e90\u4e8e\u9ad8\u5fb7\u5730\u56fe\u641c\u7d22 API\u3002GCJ-02 \u5750\u6807\u4e0e\u9ad8\u5fb7\u5e95\u56fe\u5929\u7136\u5bf9\u9f50\uff0c\u65e0\u9700\u989d\u5916\u7684\u5750\u6807\u8f6c\u6362\u3002\u5bf9\u4e8e\u9ad8\u5fb7\u6570\u636e\u5e93\u4e2d\u7f3a\u5931\u7684\u7ad9\u70b9\uff08\u5982\u4ea6\u5e84 T1 \u7ebf\uff09\uff0c\u4f7f\u7528\u624b\u52a8\u8865\u5145\u7684\u8fd1\u4f3c\u5750\u6807\u3002",
              font: "Arial", size: 22
            })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 \u6570\u636e\u683c\u5f0f")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u6784\u5efa\u540e\u6ce8\u5165\u5230 HTML \u4e2d\u7684\u6570\u636e\u7ed3\u6784\u5982\u4e0b\uff1a",
            font: "Arial", size: 22
          })]
        }),
        new Paragraph({
          spacing: { before: 60 },
          children: [new TextRun({ text: "\u6bcf\u6761\u7ebf\u8def\u5305\u542b\uff1a\u7ebf\u8def\u540d\u79f0\u3001\u6807\u8bc6\u8272\u3001\u662f\u5426\u73af\u7ebf\u3001\u65b9\u5411\u5217\u8868\u3001\u7ad9\u70b9\u5217\u8868\uff08\u542b\u7ecf\u7eac\u5ea6\uff09\u3001\u65f6\u523b\u8868\uff08\u6309\u65b9\u5411 x \u65e5\u671f\u5206\u7ec4 x \u7ad9\u70b9\u7ec4\u7ec7\uff0c\u65f6\u95f4\u5b58\u50a8\u4e3a\u5206\u949f\u6574\u6570\uff09\u3002\u65f6\u523b\u8868\u4e2d\u6bcf\u4e2a\u7ad9\u70b9\u7684\u65f6\u95f4\u5217\u8868\u4e3a\u5355\u8c03\u9012\u589e\u7684\u5206\u949f\u6574\u6570\u6570\u7ec4\uff0c\u4f8b\u5982 [300, 315, 330, ...] \u8868\u793a 5:00\u30015:15\u30015:30... \u7684\u53d1\u8f66/\u5230\u8fbe\u65f6\u95f4\u3002",
            font: "Arial", size: 22, color: "555555"
          })]
        }),

        // ═══════════════════════════════════════════════
        // 5. 构建与部署
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. \u6784\u5efa\u4e0e\u90e8\u7f72")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 \u73af\u5883\u8981\u6c42")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [headerCell("\u4f9d\u8d56", 2500), headerCell("\u7248\u672c / \u8bf4\u660e", 6526)] }),
            new TableRow({ children: [cell("Python", 2500), cell("3.x\uff08\u63a8\u8350 3.10+\uff09", 6526)] }),
            new TableRow({ children: [cell("pyjson5", 2500), cell("\u7528\u4e8e\u89e3\u6790 JSON5 \u683c\u5f0f\u65f6\u523b\u8868", 6526)] }),
            new TableRow({ children: [cell("Beijing-Subway-Tools", 2500), cell("\u9700\u514b\u9686\u5230\u4e0a\u7ea7\u76ee\u5f55 ../Beijing-Subway-Tools/", 6526)] }),
            new TableRow({ children: [cell("\u6d4f\u89c8\u5668", 2500), cell("\u652f\u6301 ES6+\u7684\u73b0\u4ee3\u6d4f\u89c8\u5668\uff08Chrome/Firefox/Edge/Safari\uff09", 6526)] }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 \u6784\u5efa\u6b65\u9aa4")] }),
        new Paragraph({
          numbering: { reference: "steps", level: 0 },
          children: [new TextRun({ text: "\u5b89\u88c5 Python \u4f9d\u8d56\uff1apip install pyjson5", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "steps", level: 0 },
          children: [new TextRun({ text: "\u514b\u9686\u65f6\u523b\u8868\u6570\u636e\uff1agit clone https://github.com/Mick235711/Beijing-Subway-Tools.git ../Beijing-Subway-Tools", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "steps", level: 0 },
          children: [new TextRun({ text: "\u6267\u884c\u6784\u5efa\uff1apython scripts/build.py\uff08\u5728\u9879\u76ee\u6839\u76ee\u5f55\u6267\u884c\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "steps", level: 0 },
          children: [new TextRun({ text: "\u6253\u5f00 index.html \u67e5\u770b\u7ed3\u679c", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 \u90e8\u7f72\u5230 GitHub Pages")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u9879\u76ee\u5df2\u90e8\u7f72\u5728 GitHub Pages \u4e0a\uff0c\u901a\u8fc7\u5c06\u4ee3\u7801\u63a8\u9001\u5230 main \u5206\u652f\u5373\u53ef\u81ea\u52a8\u66f4\u65b0\u3002\u5982\u9700\u5728\u65b0\u4ed3\u5e93\u4e2d\u90e8\u7f72\uff1a",
            font: "Arial", size: 22
          })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u5c06\u4ee3\u7801\u63a8\u9001\u5230 GitHub \u4ed3\u5e93\u7684 main \u5206\u652f", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u8fdb\u5165\u4ed3\u5e93 Settings \u2192 Pages\uff0c\u9009\u62e9 Source \u4e3a main \u5206\u652f\u7684根目录", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u4fdd\u5b58\u540e GitHub \u4f1a\u81ea\u52a8\u6784\u5efa\uff0c\u901a\u8fc7 https://<username>.github.io/<repo>/index.html \u8bbf\u95ee", font: "Arial", size: 22 })]
        }),

        // ═══════════════════════════════════════════════
        // 6. 核心算法
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. \u6838\u5fc3\u7b97\u6cd5")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 \u5217\u8f66\u4f4d\u7f6e\u63a8\u7b97")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u5217\u8f66\u4f4d\u7f6e\u63a8\u7b97\u662f\u672c\u9879\u76ee\u7684\u6838\u5fc3\u7b97\u6cd5\uff0c\u5176\u6d41\u7a0b\u5982\u4e0b\uff1a",
            font: "Arial", size: 22
          })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u8f93\u5165\uff1a\u5f53\u524d\u65f6\u95f4\uff08\u7cbe\u786e\u5230\u79d2\uff09\u3001\u7ebf\u8def\u6570\u636e\uff08\u7ad9\u70b9\u3001\u65f6\u523b\u8868\u3001\u65b9\u5411\uff09", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u65e5\u671f\u5206\u7ec4\uff1a\u6839\u636e\u661f\u671f\u786e\u5b9a\u52a0\u8f7d\u5de5\u4f5c\u65e5\u8fd8\u662f\u53cc\u4f11\u65e5\u65f6\u523b\u8868", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u9057\u5386\u7ad9\u70b9\uff1a\u5bf9\u6bcf\u8f86\u5df2\u53d1\u8f66\u7684\u5217\u8f66\uff0c\u4ece\u9996\u7ad9\u5f00\u59cb\u904d\u5386\u65f6\u523b\u8868\uff0c\u901a\u8fc7\u4e8c\u5206\u67e5\u627e\u5b9a\u4f4d\u5f53\u524d\u6240\u5728\u7684\u7ad9\u95f4\u533a\u95f4", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u63d2\u503c\u8ba1\u7b97\uff1a\u5229\u7528\u79d2\u7ea7\u65f6\u95f4\u6233\u8ba1\u7b97\u5f53\u524d\u7ad9\u95f4\u8fdb\u5ea6\u6bd4\u4f8b pr = elapsedSec / durSec", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [new TextRun({ text: "\u5750\u6807\u63d2\u503c\uff1a\u6839\u636e pr \u5bf9\u8d77\u59cb\u7ad9\u548c\u76ee\u6807\u7ad9\u7684\u7ecf\u7eac\u5ea6\u8fdb\u884c\u7ebf\u6027\u63d2\u503c\uff0c\u5f97\u5230\u5217\u8f66\u5f53\u524d\u5750\u6807", font: "Arial", size: 22 })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 \u73af\u7ebf\u5904\u7406")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u5bf9\u4e8e 2 \u53f7\u7ebf\u300110 \u53f7\u7ebf\u7b49\u73af\u7ebf\uff0c\u5217\u8f66\u5728\u5230\u8fbe\u672b\u7ad9\u540e\u4f1a\u7ee7\u7eed\u884c\u9a76\u56de\u5230\u9996\u7ad9\u3002\u7b97\u6cd5\u5728\u6b63\u5e38\u904d\u5386\u5b8c\u6240\u6709\u7ad9\u70b9\u540e\uff0c\u4f1a\u989d\u5916\u68c0\u67e5\u6700\u540e\u4e00\u4e2a\u7ad9\u70b9\u5230\u9996\u7ad9\u7684\u65f6\u523b\u8868\u6570\u636e\uff0c\u5982\u679c\u5217\u8f66\u5904\u4e8e\u8be5\u533a\u95f4\u5219\u7ee7\u7eed\u6a21\u62df\u5176\u8fd0\u884c\u3002",
            font: "Arial", size: 22
          })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 \u6df1\u591c\u4f18\u5316")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u5bf9\u4e8e\u65e9\u6668 6:00 \u4e4b\u524d\u7684\u6df1\u591c\u65f6\u6bb5\uff0c\u7b97\u6cd5\u91c7\u7528\u4e86\u4e13\u95e8\u7684\u4f18\u5316\u7b56\u7565\uff1a\u53ea\u68c0\u67e5\u6bcf\u4e2a\u65b9\u5411\u6700\u540e 6 \u8f86\u5217\u8f66\u7684\u53d1\u8f66\u65f6\u95f4\uff0c\u5e76\u5c06\u5f53\u524d\u65f6\u95f4\u52a0\u4e0a 1440 \u5206\u949f\uff08\u4e00\u5929\uff09\u8fdb\u884c\u6bd4\u8f83\uff0c\u4ee5\u6b63\u786e\u5904\u7406\u8de8\u5348\u591c\u8fd0\u884c\u7684\u5217\u8f66\u3002\u5728\u767d\u5929\u6b63\u5e38\u65f6\u6bb5\uff0c\u5229\u7528\u65f6\u523b\u8868\u7684\u6709\u5e8f\u6027\u8fdb\u884c\u63d0\u524d\u7ec8\u6b62\u7684\u4f18\u5316\uff0c\u51cf\u5c11\u4e0d\u5fc5\u8981\u7684\u904d\u5386\u3002",
            font: "Arial", size: 22
          })]
        }),

        // ═══════════════════════════════════════════════
        // 7. 用户界面设计
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. \u7528\u6237\u754c\u9762\u8bbe\u8ba1")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 \u8bbe\u8ba1\u7406\u5ff5")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u754c\u9762\u8bbe\u8ba1\u9075\u5faa\u201c\u7b80\u6d01\u3001\u6e05\u6670\u3001\u4fe1\u606f\u5bc6\u5ea6\u9002\u4e2d\u201d\u7684\u539f\u5219\u3002\u91c7\u7528\u6df1\u8272\u80cc\u666f\u7684\u73bb\u7483\u62df\u6001\u63a7\u5236\u9762\u677f\uff0c\u5750\u6807\u5b9a\u4f4d\u5728\u5de6\u4e0a\u89d2\uff0c\u4e0d\u906e\u6321\u4e3b\u8981\u5730\u56fe\u533a\u57df\u3002\u5730\u56fe\u5360\u636e\u5168\u5c4f\uff0c\u63d0\u4f9b\u6700\u5927\u5316\u7684\u53ef\u89c6\u5316\u9762\u79ef\u3002\u8bbe\u8ba1\u98ce\u683c\u504f\u5411\u6781\u7b80\u4e3b\u4e49\uff0c\u907f\u514d\u8fc7\u591a\u7684\u88c5\u9970\u6027\u5143\u7d20\u548c\u52a8\u753b\u6548\u679c\uff0c\u786e\u4fdd\u5217\u8f66\u548c\u7ebf\u8def\u59cb\u7ec8\u662f\u89c6\u89c9\u7126\u70b9\u3002",
            font: "Arial", size: 22
          })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.2 \u89c6\u89c9\u89c4\u8303")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [headerCell("\u5143\u7d20", 2500), headerCell("\u89c4\u8303", 6526)] }),
            new TableRow({ children: [cell("\u5730\u56fe\u5e95\u56fe", 2500), cell("\u767d\u5929\uff1a\u77e2\u91cf\u6807\u51c6\u5730\u56fe + 0.75 \u4eae\u5ea6 / 0.8 \u9971\u548c\u5ea6\uff1b\u591c\u665a\uff1a\u536b\u661f\u5f71\u50cf + 0.55 \u4eae\u5ea6 / 0.6 \u9971\u548c\u5ea6", 6526)] }),
            new TableRow({ children: [cell("\u7ebf\u8def\u7ebf\u6761", 2500), cell("\u7ebf\u5bbd 5px\uff0c\u900f\u660e\u5ea6 0.9\uff0c\u989c\u8272\u4e3a\u5b98\u65b9\u6807\u8bc6\u8272", 6526)] }),
            new TableRow({ children: [cell("\u666e\u901a\u7ad9\u70b9", 2500), cell("6x6 \u5706\u70b9\uff0c\u767d\u8272\u586b\u5145 + \u7ebf\u8def\u8272\u8fb9\u6846", 6526)] }),
            new TableRow({ children: [cell("\u6362\u4e58\u7ad9\u70b9", 2500), cell("9x9 \u5706\u70b9\uff0c\u663e\u8457\u653e\u5927\uff0c\u7eaf\u767d\u586b\u5145", 6526)] }),
            new TableRow({ children: [cell("\u5217\u8f66\u56fe\u6807", 2500), cell("16x16 SVG \u4e09\u89d2\u5f62\uff0c\u989c\u8272\u4e0e\u7ebf\u8def\u4e00\u81f4\uff0c\u5c16\u89d2\u6307\u5411\u884c\u9a76\u65b9\u5411", 6526)] }),
            new TableRow({ children: [cell("\u63a7\u5236\u9762\u677f", 2500), cell("280px \u5bbd\uff0c\u6df1\u8272\u534a\u900f\u660e\u80cc\u666f + \u6bdb\u7483\u6a21\u7cca\u6548\u679c\uff0c\u5706\u89d2 16px", 6526)] }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.3 \u54cd\u5e94\u5f0f\u8bbe\u8ba1")] }),
        new Paragraph({
          children: [new TextRun({
            text: "\u9879\u76ee\u652f\u6301\u79fb\u52a8\u7aef\u81ea\u9002\u5e94\u3002\u5f53\u5c4f\u5e55\u5bbd\u5ea6\u5c0f\u4e8e 600px \u65f6\uff0c\u63a7\u5236\u9762\u677f\u81ea\u52a8\u7f29\u5c0f\u4e3a 220px \u5bbd\uff0c\u5b57\u53f7\u3001\u6570\u5b57\u5927\u5c0f\u76f8\u5e94\u8c03\u6574\uff0c\u786e\u4fdd\u5728\u624b\u673a\u4e0a\u4e5f\u80fd\u6b63\u5e38\u4f7f\u7528\u3002",
            font: "Arial", size: 22
          })]
        }),

        // ═══════════════════════════════════════════════
        // 8. 已知限制与改进方向
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. \u5df2\u77e5\u9650\u5236\u4e0e\u6539\u8fdb\u65b9\u5411")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.1 \u5df2\u77e5\u9650\u5236")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [headerCell("\u95ee\u9898", 2500), headerCell("\u8bf4\u660e", 6526)] }),
            new TableRow({ children: [cell("\u6570\u636e\u7f3a\u5931", 2500), cell("\u9996\u90fd\u673a\u573a\u7ebf\u7f3a\u5931\u53cc\u4f11\u65e5\u65f6\u523b\u8868\u6570\u636e\uff08\u539f\u59cb\u6570\u636e\u4e2d\u65e0\u6b64\u5206\u7ec4\uff09", 6526)] }),
            new TableRow({ children: [cell("\u5750\u6807\u7cbe\u5ea6", 2500), cell("\u4ea6\u5e84 T1 \u7ebf\u90e8\u5206\u7ad9\u70b9\u4f7f\u7528\u8fd1\u4f3c\u5750\u6807\uff0c\u5b58\u5728\u8f7b\u5fae\u504f\u5dee", 6526)] }),
            new TableRow({ children: [cell("\u8def\u5f84\u63d2\u503c", 2500), cell("\u7ad9\u95f4\u8def\u5f84\u4e3a\u76f4\u7ebf\u63d2\u503c\uff0c\u975e\u5b9e\u9645\u8f68\u9053\u8d70\u5411\uff08\u5f2f\u9053\u3001\u5730\u4e0b\u533a\u95f4\u7b49\uff09", 6526)] }),
            new TableRow({ children: [cell("\u6587\u4ef6\u5927\u5c0f", 2500), cell("\u751f\u6210\u7684 index.html \u7ea6 1.8 MB\uff0c\u9996\u6b21\u52a0\u8f7d\u9700\u4e0b\u8f7d\u8f83\u591a\u6570\u636e", 6526)] }),
            new TableRow({ children: [cell("\u5b9e\u65f6\u6027", 2500), cell("\u57fa\u4e8e\u65f6\u523b\u8868\u63a8\u7b97\u800c\u975e\u771f\u5b9e\u5b9e\u65f6\u6570\u636e\uff0c\u65e0\u6cd5\u53cd\u6620\u4e34\u65f6\u8c03\u5ea6\u53d8\u52a8", 6526)] }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.2 \u672a\u6765\u6539\u8fdb\u65b9\u5411")] }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u5b9e\u9645\u8f68\u9053\u8def\u5f84\uff1a\u5f15\u5165\u5b9e\u9645\u8f68\u9053\u5750\u6807\u6570\u636e\uff0c\u66ff\u4ee3\u76f4\u7ebf\u63d2\u503c\uff0c\u8ba9\u5217\u8f66\u6cbf\u5b9e\u9645\u8f68\u9053\u884c\u9a76", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u62a5\u7ad9\u63d0\u9192\uff1a\u6dfb\u52a0\u7ad9\u70b9\u62a5\u7ad9\u529f\u80fd\uff0c\u53ef\u67e5\u770b\u4e0b\u4e00\u73ed\u5217\u8f66\u5230\u8fbe\u65f6\u95f4", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u62e5\u6324\u5ea6\u53ef\u89c6\u5316\uff1a\u5728\u7ad9\u70b9\u65c1\u663e\u793a\u5f53\u524d\u8be5\u7ad9\u7684\u5217\u8f66\u62e5\u6324\u7a0b\u5ea6", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u6570\u636e\u5206\u7247\u52a0\u8f7d\uff1a\u5c06\u65f6\u523b\u8868\u6570\u636e\u6309\u7ebf\u8def\u5206\u7247\u52a0\u8f7d\uff0c\u51cf\u5c0f\u9996\u6b21\u52a0\u8f7d\u65f6\u95f4", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u5386\u53f2\u6570\u636e\u66f4\u65b0\uff1a\u5f53\u5317\u4eac\u5730\u94c1\u65b0\u5f00\u901a\u7ebf\u8def\u6216\u8c03\u6574\u65f6\u523b\u8868\u65f6\uff0c\u53ca\u65f6\u66f4\u65b0\u6570\u636e\u6e90", font: "Arial", size: 22 })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "\u591a\u8bed\u8a00\u652f\u6301\uff1a\u6dfb\u52a0\u82f1\u6587\u7b49\u5916\u6587\u7ad9\u540d\u663e\u793a", font: "Arial", size: 22 })]
        }),

        // ═══════════════════════════════════════════════
        // 9. 开源协议
        // ═══════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. \u5f00\u6e90\u534f\u8bae")] }),
        new Paragraph({
          children: [
            new TextRun({ text: "\u672c\u9879\u76ee\u7684\u65f6\u523b\u8868\u6570\u636e\u6765\u6e90\u4e8e ", font: "Arial", size: 22 }),
            new ExternalHyperlink({
              children: [new TextRun({ text: "Beijing-Subway-Tools", style: "Hyperlink", font: "Arial", size: 22 })],
              link: "https://github.com/Mick235711/Beijing-Subway-Tools"
            }),
            new TextRun({ text: " \u9879\u76ee\uff0c\u8be5\u9879\u76ee\u91c7\u7528 MIT License \u5f00\u6e90\u3002\u5730\u56fe\u5e95\u56fe\u670d\u52a1\u7531\u9ad8\u5fb7\u5730\u56fe\u63d0\u4f9b\uff0c\u4ec5\u7528\u4e8e\u5c55\u793a\u76ee\u7684\u3002\u5176\u4ed6\u4ee3\u7801\u4e3a\u539f\u521b\u5f00\u53d1\u3002", font: "Arial", size: 22 })]
        }),

        spacer(600),

        // ── Footer info ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u2014 \u6587\u6863\u7ed3\u675f \u2014", font: "Arial", size: 22, color: "999999" })]
        }),
        spacer(200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u672c\u6587\u6863\u6700\u540e\u66f4\u65b0\u65e5\u671f\uff1a2026 \u5e74 4 \u6708 4 \u65e5", font: "Arial", size: 20, color: "AAAAAA" })]
        }),
      ]
    }
  ]
});

// ── Generate ──
const OUTPUT = path.join(__dirname, "..", "\u5317\u4eac\u5730\u94c1\u5b9e\u65f6\u6a21\u62df-\u4ea7\u54c1\u6587\u6863.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("OK: " + OUTPUT + " (" + (buffer.length / 1024).toFixed(1) + " KB)");
}).catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
