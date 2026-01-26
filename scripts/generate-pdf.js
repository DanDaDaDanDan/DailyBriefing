#!/usr/bin/env node

/**
 * generate-pdf.js
 * Generate PDF versions of briefings using markdown-pdf or puppeteer
 *
 * Usage: node generate-pdf.js <briefing-dir>
 *
 * Generates PDFs for short.md, detailed.md, and full.md
 *
 * Exit codes:
 *   0 - Success
 *   1 - Generation failed
 *   2 - Invalid arguments
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

/**
 * Check if a command exists
 */
function commandExists(cmd) {
    try {
        if (process.platform === 'win32') {
            execSync(`where ${cmd}`, { stdio: 'ignore' });
        } else {
            execSync(`which ${cmd}`, { stdio: 'ignore' });
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Convert markdown to PDF using available tool
 */
async function convertToPdf(mdPath, pdfPath) {
    const mdContent = fs.readFileSync(mdPath, 'utf8');

    // Try different conversion methods

    // Method 1: Use pandoc if available
    if (commandExists('pandoc')) {
        try {
            execSync(`pandoc "${mdPath}" -o "${pdfPath}" --pdf-engine=pdflatex`, {
                stdio: 'inherit'
            });
            return { success: true, method: 'pandoc' };
        } catch (e) {
            // Try without latex
            try {
                execSync(`pandoc "${mdPath}" -o "${pdfPath}"`, {
                    stdio: 'inherit'
                });
                return { success: true, method: 'pandoc-default' };
            } catch {
                // Continue to next method
            }
        }
    }

    // Method 2: Use markdown-pdf npm package
    try {
        const markdownpdf = require('markdown-pdf');
        return new Promise((resolve, reject) => {
            markdownpdf()
                .from(mdPath)
                .to(pdfPath, (err) => {
                    if (err) reject(err);
                    else resolve({ success: true, method: 'markdown-pdf' });
                });
        });
    } catch {
        // Package not installed
    }

    // Method 3: Use md-to-pdf npm package
    try {
        const { mdToPdf } = require('md-to-pdf');
        const pdf = await mdToPdf({ path: mdPath });
        if (pdf) {
            fs.writeFileSync(pdfPath, pdf.content);
            return { success: true, method: 'md-to-pdf' };
        }
    } catch {
        // Package not installed
    }

    // Method 4: Create HTML and note that PDF needs manual generation
    const htmlPath = pdfPath.replace('.pdf', '.html');
    const html = generateHtml(mdContent, path.basename(mdPath, '.md'));
    fs.writeFileSync(htmlPath, html);

    return {
        success: false,
        fallback: 'html',
        htmlPath: htmlPath,
        message: 'PDF generation tools not available. HTML version created instead.'
    };
}

/**
 * Generate HTML from markdown (basic conversion)
 */
function generateHtml(mdContent, title) {
    // Basic markdown to HTML conversion
    let html = mdContent
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Lists
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        // Paragraphs
        .replace(/\n\n/g, '</p><p>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr>');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Daily Briefing - ${title}</title>
    <style>
        body {
            font-family: Georgia, 'Times New Roman', serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #2a2a2a; margin-top: 30px; }
        h3 { color: #3a3a3a; }
        a { color: #0066cc; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
        hr { border: none; border-top: 1px solid #ccc; margin: 30px 0; }
        .metadata { color: #666; font-size: 0.9em; }
        blockquote {
            border-left: 3px solid #ccc;
            margin-left: 0;
            padding-left: 20px;
            color: #555;
        }
    </style>
</head>
<body>
    <p>${html}</p>
</body>
</html>`;
}

/**
 * Generate all PDFs for a briefing
 */
async function generateAllPdfs(briefingDir) {
    const outputDir = path.join(briefingDir, 'briefings');

    if (!fs.existsSync(outputDir)) {
        return { success: false, error: 'Briefings directory not found' };
    }

    const files = ['short.md', 'detailed.md', 'full.md'];
    const results = [];

    for (const file of files) {
        const mdPath = path.join(outputDir, file);
        const pdfPath = path.join(outputDir, file.replace('.md', '.pdf'));

        if (!fs.existsSync(mdPath)) {
            results.push({
                file: file,
                success: false,
                error: 'Source file not found'
            });
            continue;
        }

        try {
            const result = await convertToPdf(mdPath, pdfPath);
            results.push({
                file: file,
                ...result,
                pdfPath: pdfPath
            });
        } catch (error) {
            results.push({
                file: file,
                success: false,
                error: error.message
            });
        }
    }

    const allSuccess = results.every(r => r.success);

    return {
        success: allSuccess,
        results: results,
        outputDir: outputDir
    };
}

/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: node generate-pdf.js <briefing-dir>');
        process.exit(2);
    }

    const briefingDir = args[0];

    if (!fs.existsSync(briefingDir)) {
        console.error(`Briefing directory not found: ${briefingDir}`);
        process.exit(2);
    }

    console.log('Generating PDFs...');

    try {
        const result = await generateAllPdfs(briefingDir);

        console.log('=== PDF_RESULT ===');
        console.log(JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('\nAll PDFs generated successfully');
            process.exit(0);
        } else {
            console.log('\nSome PDFs could not be generated');
            console.log('HTML versions may have been created as fallback');
            // Exit 0 even if fallback to HTML (not a fatal error)
            const hasFatalError = result.results.some(r =>
                !r.success && r.fallback !== 'html' && r.error !== 'Source file not found'
            );
            process.exit(hasFatalError ? 1 : 0);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
