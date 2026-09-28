// Static fallback testimonials (used when Supabase is unavailable)
export const fallbackTestimonials = {
  employer: [
    {
      quote:
        'I needed 4 movers urgently for a Saturday relocation. Within 20 minutes I had verified workers confirmed. The escrow system gave me total peace of mind.',
      name: 'Chioma Okafor',
      role: 'Business Owner, Lagos',
      rating: 5,
    },
    {
      quote:
        'No more chasing randos on WhatsApp groups. Every worker on menial has verified ID. For a woman hiring alone, that safety guarantee is everything.',
      name: 'Amaka Eze',
      role: 'Homeowner, Abuja',
      rating: 5,
    },
    {
      quote:
        'Hired 10 event setup hands for our company dinner. All showed up on time, did excellent work. The platform fee is worth every kobo.',
      name: 'Emeka Nwosu',
      role: 'Events Manager, Lagos',
      rating: 5,
    },
    {
      quote:
        'The escrow feature is brilliant. I paid, the workers showed up, I confirmed completion, they got paid. No drama, no disputes. Clean and professional.',
      name: 'Bola Adeyemi',
      role: 'Property Developer, Ibadan',
      rating: 5,
    },
    {
      quote:
        'Finally a platform that takes worker safety seriously too. The SOS button and identity verification make menial stand out from everything else out there.',
      name: 'Tunde Fashola',
      role: 'Construction Manager, Port Harcourt',
      rating: 5,
    },
  ],
  worker: [
    {
      quote:
        'Before menial I was doing 3-day unpaid trials just to get hired. Now I get same-day pay directly to my GTBank. My life has completely changed.',
      name: 'Musa Ibrahim',
      role: 'Verified Cleaner · Lagos · ★ 4.9',
      rating: 5,
    },
    {
      quote:
        'The NIN badge shows employers I am trustworthy. I get more job offers now than I can accept. menial has given my work real dignity.',
      name: 'Chukwuemeka Obi',
      role: 'Verified Labourer · Abuja · ★ 4.8',
      rating: 5,
    },
    {
      quote:
        'I used to wait weeks for payment. On menial, I tap complete and money is in my account within minutes. No middlemen, no stories.',
      name: 'Grace Idowu',
      role: 'Verified House Help · Lagos · ★ 5.0',
      rating: 5,
    },
    {
      quote:
        'The SOS button means my family knows I am safe on every job. I recommend every worker in Nigeria to join menial right now.',
      name: 'Yusuf Abdullahi',
      role: 'Verified Guard · Kano · ★ 4.7',
      rating: 5,
    },
    {
      quote:
        'I have done 142 jobs on menial. Each one transparent — the employer sets the pay before I accept. No negotiation stress, just work and get paid.',
      name: 'Ngozi Okonkwo',
      role: 'Verified Caterer · Enugu · ★ 4.9',
      rating: 5,
    },
  ],
}

export type Testimonial = {
  quote: string
  name: string
  role: string
  rating: number
}

export type TestimonialsData = {
  employer: Testimonial[]
  worker: Testimonial[]
}
