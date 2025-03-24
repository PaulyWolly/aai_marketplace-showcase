import { Component } from '@angular/core';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent {
  faqSections = [
    {
      title: 'Getting Started',
      items: [
        {
          question: 'What is AAI - Appraise An Item?',
          answer: 'AAI is a platform that allows you to get professional appraisals for your items and showcase them to other users. You can upload images of your items, add details, and receive estimates of their value.'
        },
        {
          question: 'How do I create an account?',
          answer: 'Click on the "Register" button in the top-right corner of the homepage. Fill in your details including name, email, and password, then follow the verification steps.'
        },
        {
          question: 'Is registration free?',
          answer: 'Yes, creating an account is completely free. There may be premium features available in the future.'
        }
      ]
    },
    {
      title: 'Managing Your Items',
      items: [
        {
          question: 'How do I add a new item?',
          answer: 'Go to "My Items" in the left navigation menu and click the "Add New Item" button. You can then enter details about your item and upload images.'
        },
        {
          question: 'Can I edit my items after adding them?',
          answer: 'Yes, you can edit your items at any time. Go to "My Items", find the item you want to edit, and click the pencil (edit) icon.'
        },
        {
          question: 'How do I delete an item?',
          answer: 'Go to "My Items", find the item you want to delete, and click the trash (delete) icon. You will be asked to confirm before the item is permanently deleted.'
        },
        {
          question: 'What does publishing an item do?',
          answer: 'Publishing an item makes it visible on the public showcase where other users can view it. You can toggle an item\'s published status using the book icon in your item list.'
        }
      ]
    },
    {
      title: 'Appraisals',
      items: [
        {
          question: 'How do I get an item appraised?',
          answer: 'Click on "Appraise Item" in the left navigation menu. You can then take or upload a photo of your item and provide additional details to receive an appraisal.'
        },
        {
          question: 'How accurate are the appraisals?',
          answer: 'Our appraisals provide an estimated value range based on similar items and market conditions. While we strive for accuracy, values can vary based on many factors including condition, rarity, and market demand.'
        },
        {
          question: 'Where can I see my past appraisals?',
          answer: 'Go to "Appraisal History" in the left navigation menu to view all your past appraisals.'
        }
      ]
    },
    {
      title: 'Showcase',
      items: [
        {
          question: 'What is the Showcase?',
          answer: 'The Showcase is a public gallery where users can view items that have been published by other members. It\'s a great way to explore interesting items and their estimated values.'
        },
        {
          question: 'How do I view an item in the Showcase?',
          answer: 'From the Showcase page, click on any item card to see detailed information about that item. You can also use the eye icon from your item list to view your own items as they appear in the Showcase.'
        },
        {
          question: 'How do I contact an item\'s owner?',
          answer: 'When viewing an item in the Showcase, you can click the "Contact Member" button to send a message to the item\'s owner.'
        }
      ]
    },
    {
      title: 'Account Settings',
      items: [
        {
          question: 'How do I update my profile information?',
          answer: 'Go to "Profile" in the left navigation menu. You can edit your personal information, change your password, and manage notification preferences.'
        },
        {
          question: 'Can I change my email address?',
          answer: 'Yes, you can change your email address from the Profile page. You may need to verify your new email address after making this change.'
        },
        {
          question: 'How do I reset my password?',
          answer: 'If you\'re logged in, go to your Profile and select the option to change your password. If you\'re not logged in, click "Forgot Password" on the login page and follow the instructions sent to your email.'
        }
      ]
    }
  ];

  expandedSection = 0;
} 