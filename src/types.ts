import React from 'react';

export interface Project {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
  area?: string;
  date?: string;
  location?: string;
  gallery?: string[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  renderIcon: () => React.ReactNode;
}

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  category: string;
  imageUrl: string;
}

export interface Testimonial {
  id: number;
  name: string;
  country: string;
  stars: number;
  text_en: string;
  text_am: string;
}
