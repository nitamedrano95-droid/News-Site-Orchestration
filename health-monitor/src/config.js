export function getCmsWorkers(env) {
  return [
    {
      name: 'cms-nuevos',
      slug: 'nuevos',
      binding: 'CMS_NUEVOS',
      siteCount: 17,
    },
    {
      name: 'cms-nuevos2',
      slug: 'nuevos2',
      binding: 'CMS_NUEVOS2',
      siteCount: 8,
    },
    {
      name: 'cms-nuevos3',
      slug: 'nuevos3',
      binding: 'CMS_NUEVOS3',
      siteCount: 24,
    },
    {
      name: 'cms-originaux',
      slug: 'originaux',
      binding: 'CMS_ORIGINAUX',
      siteCount: 10,
    },
    {
      name: 'cms-nuevos4',
      slug: 'nuevos4',
      binding: 'CMS_NUEVOS4',
      siteCount: 25,
    },
  ];
}

export const THRESHOLDS = {
  cronMaxAgeMs: 2 * 60 * 60 * 1000,
  fbMaxAgeMs: 8 * 60 * 60 * 1000,
  pendingWarning: 2,
  pendingCritical: 0,
};

export const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
