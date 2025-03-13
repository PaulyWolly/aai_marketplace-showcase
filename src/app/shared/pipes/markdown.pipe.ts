import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown'
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    // Configure marked options
    marked.setOptions({
      gfm: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: true
    });
  }

  transform(value: string): SafeHtml {
    if (!value) return '';
    
    try {
      console.log('Transforming markdown:', value);
      const html = marked(value);
      console.log('Generated HTML:', html);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Error transforming markdown:', error);
      return this.sanitizer.bypassSecurityTrustHtml(`<pre>${value}</pre>`);
    }
  }
} 