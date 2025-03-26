// Example breadcrumb logic
const getBreadcrumbs = (path: string) => {
  const parts = path.split('/').filter(Boolean);
  
  if (parts[0] === 'destinations' && parts.length === 1) {
    return [
      { label: 'Home', path: '/' },
      { label: 'Destinations', path: '/destinations' }
    ];
  }
  
  if (parts[0] === 'collections' && parts.length === 1) {
    return [
      { label: 'Home', path: '/' },
      { label: 'Collections', path: '/collections' }
    ];
  }
  
  if (parts[0] === 'planner') {
    return [
      { label: 'Home', path: '/' },
      { label: 'AI Planner', path: '/planner' }
    ];
  }
  
  // Other breadcrumb logic
}; 