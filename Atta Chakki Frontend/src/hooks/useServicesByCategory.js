import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { toast } from 'sonner';

/**
 * Custom hook to manage services grouped by categories with in-memory caching.
 * Encapsulates category tabs, per-category lazy fetch, and cache invalidation.
 */
export function useServicesByCategory() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const productsCacheRef = useRef({});

  const fetchServicesForCategory = useCallback(async (categoryId, { force = false } = {}) => {
    if (!categoryId) return;

    if (!force && productsCacheRef.current[categoryId]) {
      setServices(productsCacheRef.current[categoryId]);
      setLoading(false);
      return;
    }

    try {
      setTabLoading(true);
      const res = await fetch(`${API_BASE_URL}/get_all_products.php?category_id=${categoryId}`);
      const data = await res.json();
      const list = data.data || data.products || [];
      if ((data.status === 'success' || data.success) && Array.isArray(list)) {
        productsCacheRef.current[categoryId] = list;
        setServices(list);
      } else {
        toast.error(data.message || 'Failed to load services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Network error while loading services');
    } finally {
      setLoading(false);
      setTabLoading(false);
    }
  }, []);

  const refreshActiveCategory = useCallback(() => {
    productsCacheRef.current = {};
    if (activeCategoryId) {
      fetchServicesForCategory(activeCategoryId, { force: true });
    }
  }, [activeCategoryId, fetchServicesForCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_categories.php`);
      const data = await res.json();
      const list = data.data || data.categories || [];
      if ((data.status === 'success' || data.success) && Array.isArray(list)) {
        setCategories(list);
        if (list.length > 0) {
          setActiveCategoryId(prev => prev ?? list[0].id);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (activeCategoryId) {
      fetchServicesForCategory(activeCategoryId);
    }
  }, [activeCategoryId, fetchServicesForCategory]);

  const handleTabChange = useCallback((categoryId) => {
    if (categoryId === activeCategoryId) return;
    setActiveCategoryId(categoryId);
  }, [activeCategoryId]);

  const invalidateCache = useCallback(() => {
    productsCacheRef.current = {};
  }, []);

  return {
    services,
    setServices,
    categories,
    activeCategoryId,
    setActiveCategoryId,
    loading,
    tabLoading,
    handleTabChange,
    refreshActiveCategory,
    fetchCategories,
    invalidateCache,
  };
}
