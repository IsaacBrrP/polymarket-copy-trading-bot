import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface SecurityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  file: string;
  line?: number;
  description: string;
  recommendation: string;
  cwe?: string;
}

interface SecurityReport {
  timestamp: string;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  infoIssues: number;
  securityScore: number;
  issues: SecurityIssue[];
}

class SecurityScanner {
  private issues: SecurityIssue[] = [];
  private scannedFiles: Set<string> = new Set();

  async scan(): Promise<SecurityReport> {
    console.log(chalk.blue('🔍 Starting Security Scan...\n'));

    // Scan different aspects
    await this.scanEnvironmentSecurity();
    await this.scanCodeSecurity();
    await this.scanDependencies();
    await this.scanCryptography();
    await this.scanInputValidation();
    await this.scanAuthenticationSecurity();
    await this.scanDataExposure();
    await this.scanDockerSecurity();

    return this.generateReport();
  }

  private async scanEnvironmentSecurity(): Promise<void> {
    console.log(chalk.cyan('📋 Scanning Environment Configuration...'));

    const envFile = path.join(process.cwd(), '.env');
    const envExampleFile = path.join(process.cwd(), '.env.example');
    const gitignore = path.join(process.cwd(), '.gitignore');

    // Check if .env.example exists
    if (!fs.existsSync(envExampleFile)) {
      this.addIssue({
        severity: 'MEDIUM',
        category: 'Configuration',
        file: '.env.example',
        description: 'Missing .env.example file for documentation',
        recommendation: 'Create .env.example with placeholder values to document required environment variables',
        cwe: 'CWE-520',
      });
    }

    // Check if .env is in .gitignore
    if (fs.existsSync(gitignore)) {
      const gitignoreContent = fs.readFileSync(gitignore, 'utf-8');
      if (!gitignoreContent.includes('.env')) {
        this.addIssue({
          severity: 'CRITICAL',
          category: 'Secret Management',
          file: '.gitignore',
          description: '.env file not properly excluded from version control',
          recommendation: 'Add .env to .gitignore to prevent committing secrets',
          cwe: 'CWE-312',
        });
      }
    }

    // Check for hardcoded secrets in source files
    await this.scanForHardcodedSecrets();
  }

  private async scanForHardcodedSecrets(): Promise<void> {
    const srcDir = path.join(process.cwd(), 'src');
    const patterns = [
      { regex: /private[_-]?key\s*[:=]\s*["'](?!.*env|.*process\.env)[^"']{20,}/gi, name: 'Private Key' },
      { regex: /api[_-]?key\s*[:=]\s*["'](?!.*env|.*process\.env)[^"']{20,}/gi, name: 'API Key' },
      { regex: /secret\s*[:=]\s*["'](?!.*env|.*process\.env)[^"']{20,}/gi, name: 'Secret' },
      { regex: /password\s*[:=]\s*["'](?!.*env|.*process\.env).+["']/gi, name: 'Password' },
      { regex: /0x[a-fA-F0-9]{64}/g, name: 'Ethereum Private Key' },
    ];

    this.scanDirectory(srcDir, (filePath, content) => {
      patterns.forEach((pattern) => {
        const matches = content.matchAll(pattern.regex);
        for (const match of matches) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          this.addIssue({
            severity: 'CRITICAL',
            category: 'Secret Management',
            file: filePath,
            line: lineNumber,
            description: `Potential hardcoded ${pattern.name} detected`,
            recommendation: 'Use environment variables or secure secret management for sensitive data',
            cwe: 'CWE-798',
          });
        }
      });
    });
  }

  private async scanCodeSecurity(): Promise<void> {
    console.log(chalk.cyan('🔐 Scanning Code Security...'));

    const srcDir = path.join(process.cwd(), 'src');

    this.scanDirectory(srcDir, (filePath, content) => {
      // Check for eval usage
      if (/\beval\s*\(/.test(content)) {
        this.addIssue({
          severity: 'CRITICAL',
          category: 'Code Injection',
          file: filePath,
          description: 'Use of eval() detected - potential code injection vulnerability',
          recommendation: 'Avoid using eval(). Use safer alternatives like JSON.parse() for data',
          cwe: 'CWE-95',
        });
      }

      // Check for console.log with potential sensitive data
      const consoleMatches = content.matchAll(/console\.(log|error|warn|info)\((.*privateKey|.*password|.*secret)/gi);
      for (const match of consoleMatches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        this.addIssue({
          severity: 'HIGH',
          category: 'Data Exposure',
          file: filePath,
          line: lineNumber,
          description: 'Potential logging of sensitive information',
          recommendation: 'Ensure sensitive data is not logged. Use sanitization before logging',
          cwe: 'CWE-532',
        });
      }

      // Check for SQL injection patterns (if any database queries)
      if (/\$\{.*\}.*query|query.*\+.*req\.|exec\(.*\+/i.test(content)) {
        this.addIssue({
          severity: 'HIGH',
          category: 'Injection',
          file: filePath,
          description: 'Potential SQL/NoSQL injection vulnerability',
          recommendation: 'Use parameterized queries or ORM methods to prevent injection',
          cwe: 'CWE-89',
        });
      }

      // Check for unsafe regex (ReDoS)
      const regexPatterns = content.matchAll(/new\s+RegExp\(|\/.*\(.*\+.*\*.*\)/g);
      for (const match of regexPatterns) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        this.addIssue({
          severity: 'MEDIUM',
          category: 'Denial of Service',
          file: filePath,
          line: lineNumber,
          description: 'Complex regex pattern may be vulnerable to ReDoS attacks',
          recommendation: 'Review regex patterns for catastrophic backtracking',
          cwe: 'CWE-1333',
        });
      }
    });
  }

  private async scanDependencies(): Promise<void> {
    console.log(chalk.cyan('📦 Scanning Dependencies...'));

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Check for outdated ethers version
      if (packageJson.dependencies?.ethers) {
        const version = packageJson.dependencies.ethers;
        if (version.includes('^5.')) {
          this.addIssue({
            severity: 'MEDIUM',
            category: 'Dependency',
            file: 'package.json',
            description: 'Using ethers v5 which is older version',
            recommendation: 'Consider upgrading to ethers v6 for latest security patches',
            cwe: 'CWE-1104',
          });
        }
      }

      // Check for missing package-lock.json
      const packageLockPath = path.join(process.cwd(), 'package-lock.json');
      if (!fs.existsSync(packageLockPath)) {
        this.addIssue({
          severity: 'MEDIUM',
          category: 'Dependency',
          file: 'package-lock.json',
          description: 'Missing package-lock.json file',
          recommendation: 'Commit package-lock.json to ensure deterministic builds',
          cwe: 'CWE-1104',
        });
      }
    }
  }

  private async scanCryptography(): Promise<void> {
    console.log(chalk.cyan('🔒 Scanning Cryptographic Security...'));

    const srcDir = path.join(process.cwd(), 'src');

    this.scanDirectory(srcDir, (filePath, content) => {
      // Check for weak random number generation
      if (/Math\.random\(\)/.test(content)) {
        this.addIssue({
          severity: 'HIGH',
          category: 'Cryptography',
          file: filePath,
          description: 'Use of Math.random() for potentially sensitive operations',
          recommendation: 'Use crypto.randomBytes() for cryptographically secure random numbers',
          cwe: 'CWE-338',
        });
      }

      // Check for private key handling
      if (/privateKey/.test(content)) {
        const lineMatches = content.matchAll(/privateKey/g);
        for (const match of lineMatches) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const line = content.split('\n')[lineNumber - 1];

          // Check if private key is being logged or stored insecurely
          if (/console\.|localStorage|sessionStorage|\.log/.test(line)) {
            this.addIssue({
              severity: 'CRITICAL',
              category: 'Cryptography',
              file: filePath,
              line: lineNumber,
              description: 'Private key may be exposed through logging or storage',
              recommendation: 'Never log or store private keys. Keep them in memory only',
              cwe: 'CWE-320',
            });
          }
        }
      }
    });
  }

  private async scanInputValidation(): Promise<void> {
    console.log(chalk.cyan('✅ Scanning Input Validation...'));

    const envFile = path.join(process.cwd(), 'src/modules/config/env.ts');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8');

      // Check for address validation
      if (!content.includes('0x') || !content.includes('isAddress') && content.includes('Address')) {
        this.addIssue({
          severity: 'HIGH',
          category: 'Input Validation',
          file: 'src/modules/config/env.ts',
          description: 'Missing Ethereum address validation',
          recommendation: 'Validate Ethereum addresses using ethers.utils.isAddress()',
          cwe: 'CWE-20',
        });
      }

      // Check for numeric validation
      if (content.includes('Number(') && !content.includes('isNaN')) {
        this.addIssue({
          severity: 'MEDIUM',
          category: 'Input Validation',
          file: 'src/modules/config/env.ts',
          description: 'Numeric conversion without NaN validation',
          recommendation: 'Validate numeric inputs and handle NaN cases',
          cwe: 'CWE-20',
        });
      }
    }
  }

  private async scanAuthenticationSecurity(): Promise<void> {
    console.log(chalk.cyan('🔑 Scanning Authentication & Authorization...'));

    const srcDir = path.join(process.cwd(), 'src');

    this.scanDirectory(srcDir, (filePath, content) => {
      // Check for RPC URL security
      if (/rpcUrl|RPC_URL/.test(content) && !content.includes('https://')) {
        this.addIssue({
          severity: 'HIGH',
          category: 'Authentication',
          file: filePath,
          description: 'RPC URL should use HTTPS for secure communication',
          recommendation: 'Ensure RPC URLs use HTTPS protocol',
          cwe: 'CWE-319',
        });
      }

      // Check for insufficient error handling that may leak info
      if (/catch\s*\(\s*\w+\s*\)\s*{\s*console\.(log|error)\s*\(\s*\w+/.test(content)) {
        this.addIssue({
          severity: 'LOW',
          category: 'Information Disclosure',
          file: filePath,
          description: 'Error details may be exposed in logs',
          recommendation: 'Sanitize error messages before logging',
          cwe: 'CWE-209',
        });
      }
    });
  }

  private async scanDataExposure(): Promise<void> {
    console.log(chalk.cyan('🛡️  Scanning Data Exposure...'));

    const srcDir = path.join(process.cwd(), 'src');

    this.scanDirectory(srcDir, (filePath, content) => {
      // Check for unrestricted CORS
      if (/cors.*origin.*\*/.test(content)) {
        this.addIssue({
          severity: 'MEDIUM',
          category: 'Access Control',
          file: filePath,
          description: 'Unrestricted CORS policy detected',
          recommendation: 'Restrict CORS to specific domains',
          cwe: 'CWE-942',
        });
      }

      // Check for sensitive data in comments
      if (/(password|secret|key)\s*[:=]\s*\w+/i.test(content.match(/\/\/.*|\/\*[\s\S]*?\*\//g)?.join('') || '')) {
        this.addIssue({
          severity: 'MEDIUM',
          category: 'Data Exposure',
          file: filePath,
          description: 'Potential sensitive data in comments',
          recommendation: 'Remove sensitive information from code comments',
          cwe: 'CWE-615',
        });
      }
    });
  }

  private async scanDockerSecurity(): Promise<void> {
    console.log(chalk.cyan('🐳 Scanning Docker Security...'));

    const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');

      // Check for running as root
      if (!content.includes('USER')) {
        this.addIssue({
          severity: 'MEDIUM',
          category: 'Container Security',
          file: 'Dockerfile',
          description: 'Container runs as root user',
          recommendation: 'Create and use a non-root user in Dockerfile',
          cwe: 'CWE-250',
        });
      }

      // Check for latest tag usage
      if (/FROM.*:latest/.test(content)) {
        this.addIssue({
          severity: 'LOW',
          category: 'Container Security',
          file: 'Dockerfile',
          description: 'Using :latest tag for base image',
          recommendation: 'Pin specific version tags for reproducible builds',
          cwe: 'CWE-1104',
        });
      }

      // Check for secrets in build
      if (/ARG.*SECRET|ARG.*PASSWORD|ARG.*KEY/.test(content)) {
        this.addIssue({
          severity: 'HIGH',
          category: 'Container Security',
          file: 'Dockerfile',
          description: 'Potential secrets passed as build arguments',
          recommendation: 'Use Docker secrets or runtime environment variables instead',
          cwe: 'CWE-526',
        });
      }
    }
  }

  private scanDirectory(dir: string, callback: (filePath: string, content: string) => void): void {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        this.scanDirectory(fullPath, callback);
      } else if (file.isFile() && /\.(ts|js|json)$/.test(file.name)) {
        if (!this.scannedFiles.has(fullPath)) {
          this.scannedFiles.add(fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          callback(path.relative(process.cwd(), fullPath), content);
        }
      }
    }
  }

  private addIssue(issue: SecurityIssue): void {
    this.issues.push(issue);
  }

  private generateReport(): SecurityReport {
    const criticalIssues = this.issues.filter((i) => i.severity === 'CRITICAL').length;
    const highIssues = this.issues.filter((i) => i.severity === 'HIGH').length;
    const mediumIssues = this.issues.filter((i) => i.severity === 'MEDIUM').length;
    const lowIssues = this.issues.filter((i) => i.severity === 'LOW').length;
    const infoIssues = this.issues.filter((i) => i.severity === 'INFO').length;

    // Calculate security score (0-100)
    const maxScore = 100;
    const criticalPenalty = criticalIssues * 20;
    const highPenalty = highIssues * 10;
    const mediumPenalty = mediumIssues * 5;
    const lowPenalty = lowIssues * 2;
    const infoPenalty = infoIssues * 1;

    const totalPenalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty + infoPenalty;
    const securityScore = Math.max(0, maxScore - totalPenalty);

    return {
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      infoIssues,
      securityScore,
      issues: this.issues,
    };
  }

  printReport(report: SecurityReport): void {
    console.log('\n' + '='.repeat(80));
    console.log(chalk.bold.white('SECURITY SCAN REPORT'));
    console.log('='.repeat(80));
    console.log(chalk.gray(`Generated: ${report.timestamp}\n`));

    // Security Score
    const scoreColor =
      report.securityScore >= 80
        ? chalk.green
        : report.securityScore >= 60
          ? chalk.yellow
          : chalk.red;

    console.log(chalk.bold('SECURITY SCORE: ') + scoreColor(`${report.securityScore}/100`));

    const rating =
      report.securityScore >= 90
        ? 'EXCELLENT'
        : report.securityScore >= 80
          ? 'GOOD'
          : report.securityScore >= 60
            ? 'FAIR'
            : report.securityScore >= 40
              ? 'POOR'
              : 'CRITICAL';

    console.log(chalk.bold('RATING: ') + scoreColor(rating) + '\n');

    // Summary
    console.log(chalk.bold('ISSUE SUMMARY:'));
    console.log(`  Total Issues: ${report.totalIssues}`);
    if (report.criticalIssues > 0)
      console.log(chalk.red(`  🔴 Critical: ${report.criticalIssues}`));
    if (report.highIssues > 0) console.log(chalk.red(`  🟠 High: ${report.highIssues}`));
    if (report.mediumIssues > 0)
      console.log(chalk.yellow(`  🟡 Medium: ${report.mediumIssues}`));
    if (report.lowIssues > 0) console.log(chalk.blue(`  🔵 Low: ${report.lowIssues}`));
    if (report.infoIssues > 0) console.log(chalk.gray(`  ⚪ Info: ${report.infoIssues}`));

    // Detailed Issues
    if (report.issues.length > 0) {
      console.log('\n' + chalk.bold('DETAILED FINDINGS:\n'));

      const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      const sortedIssues = report.issues.sort(
        (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
      );

      sortedIssues.forEach((issue, idx) => {
        const severityColor =
          issue.severity === 'CRITICAL'
            ? chalk.red.bold
            : issue.severity === 'HIGH'
              ? chalk.red
              : issue.severity === 'MEDIUM'
                ? chalk.yellow
                : issue.severity === 'LOW'
                  ? chalk.blue
                  : chalk.gray;

        console.log(chalk.bold(`${idx + 1}. [${severityColor(issue.severity)}] ${issue.category}`));
        console.log(`   File: ${chalk.cyan(issue.file)}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   ${issue.description}`);
        console.log(chalk.green(`   ✓ ${issue.recommendation}`));
        if (issue.cwe) console.log(chalk.gray(`   CWE: ${issue.cwe}`));
        console.log('');
      });
    } else {
      console.log(chalk.green('\n✅ No security issues detected!\n'));
    }

    console.log('='.repeat(80) + '\n');
  }

  saveReport(report: SecurityReport): void {
    const reportsDir = path.join(process.cwd(), 'security-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `security-scan-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(chalk.green(`📄 Report saved to: ${reportPath}\n`));
  }
}

async function main(): Promise<void> {
  const scanner = new SecurityScanner();
  const report = await scanner.scan();

  scanner.printReport(report);
  scanner.saveReport(report);

  // Exit with error code if critical issues found
  if (report.criticalIssues > 0) {
    console.log(chalk.red.bold('⚠️  CRITICAL ISSUES DETECTED - IMMEDIATE ACTION REQUIRED'));
    process.exit(1);
  } else if (report.securityScore < 60) {
    console.log(chalk.yellow.bold('⚠️  SECURITY SCORE BELOW ACCEPTABLE THRESHOLD'));
    process.exit(1);
  } else {
    console.log(chalk.green.bold('✅ Security scan completed'));
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(chalk.red('Security scan failed:'), err);
  process.exit(1);
});
