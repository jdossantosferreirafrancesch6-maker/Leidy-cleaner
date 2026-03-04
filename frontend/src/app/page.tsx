"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient, Service } from '../services/api';
import ServiceCard from '@/components/ServiceCard';
import ServiceFilter from '@/components/ServiceFilter';
import RecommendationsWidget from '@/components/RecommendationsWidget';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Star, Shield, Clock, Users, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpts, setFilterOpts] = useState<{ category?: string; search?: string }>({});
  const [reviewStats, setReviewStats] = useState<Record<string, { avg: number; count: number }>>({});
  const { t } = useTranslation();

  const load = async (opts: { category?: string; search?: string } = {}) => {
    setLoading(true);
    try {
      const res = await apiClient.getServices({ limit: 12, ...opts });
      setServices(res.services || []);
      try {
        const revs = await apiClient.getPublicReviews();
        const stats: Record<string, { avg: number; count: number }> = {};
        revs.forEach((r) => {
          if (!r.serviceId) return;
          if (!stats[r.serviceId]) {
            stats[r.serviceId] = { avg: r.rating, count: 1 };
          } else {
            const st = stats[r.serviceId];
            st.count += 1;
            st.avg = (st.avg * (st.count - 1) + r.rating) / st.count;
          }
        });
        setReviewStats(stats);
      } catch {
        // ignore
      }
    } catch (err) {
      // console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const features = [
    {
      icon: Shield,
      title: t('home.features.feature1.title'),
      description: t('home.features.feature1.description')
    },
    {
      icon: Clock,
      title: t('home.features.feature2.title'),
      description: t('home.features.feature2.description')
    },
    {
      icon: Star,
      title: t('home.features.feature3.title'),
      description: t('home.features.feature3.description')
    },
    {
      icon: Users,
      title: t('home.features.feature4.title'),
      description: t('home.features.feature4.description')
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-accent/80 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('home.hero.badge')}
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                {t('home.hero.title')}
                <span className="block text-accent-foreground">{t('home.hero.titleBold')}</span>
              </h1>
              <p className="text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                {t('home.hero.subtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/services">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-lg">
                  {t('home.hero.cta1')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  {t('home.hero.cta2')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendations Section - Only for authenticated users */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <RecommendationsWidget />
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('services.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('services.subtitle')}
            </p>
          </div>

          <div className="mb-8">
            <ServiceFilter onChange={(o) => { setFilterOpts(o); load(o); }} />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {services.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    rating={reviewStats[s.id]?.avg}
                    reviewCount={reviewStats[s.id]?.count}
                  />
                ))}
              </div>

              <div className="text-center">
                <Link href="/services">
                  <Button variant="outline" size="lg" className="hover:bg-primary hover:text-white transition-colors">
                    {t('buttons.viewMore')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold">
                {t('buttons.start')}
              </h2>
              <p className="text-xl text-white/90">
                Agende seu serviço hoje mesmo e tenha uma experiência excepcional
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Criar Conta Grátis
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Falar com Especialista
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
