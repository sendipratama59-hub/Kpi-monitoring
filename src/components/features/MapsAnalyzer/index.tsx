import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { MapPin, Search, Navigation, Save, Map, Trash2, ArrowRight, RefreshCw, Filter, X, Wand2, Star, Clock, Info, ClipboardList, Navigation2, CheckCircle2, Download } from 'lucide-react';
import { useAlert } from '../../ui/AlertModal';
import { supabase } from '../../../services/supabase';
import { LocationInfo, SavedMapData } from './types';
import { calculateDistance } from './utils';
import { ConfirmModal } from './components/ConfirmModal';
import { MapsSyncStatus } from './components/MapsSyncStatus';
import { PricingInfoModal } from './components/PricingInfoModal';
import SurveyLcd from '../SurveyLcd';
import * as XLSX from 'xlsx';

export default function MapsAnalyzer() {
  const [mapsLink, setMapsLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // New States for Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [nextPageTokenPlaces, setNextPageTokenPlaces] = useState<string | null>(null);
  const [isLoadingMorePlaces, setIsLoadingMorePlaces] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState<'search'|'link'|'bulk'>('search');
  
  const [bulkKeywords, setBulkKeywords] = useState("Service hp\nSmartphone service\nSmartphone repair\nService handphone\nService iphone\nService android\nReparasi ponsel\nReparasi hp\nBengkel hp\nBengkel iphone\nService ponsel\nReparasi handphone\nSparepart hp\nSparepart handphone\nSparepart android\nServis hp\nServis handphone\nServis iphone\nServis android\nReparasi iphone\nReparasi android");
  const [bulkArea, setBulkArea] = useState("Bandung");
  const [bulkPositiveFilter, setBulkPositiveFilter] = useState("service\nreparasi\nbengkel\nperbaikan\nhp\nhandphone\nponsel\nsmartphone\niphone\napple\nsamsung\nxiaomi\noppo\nvivo\nrealme\nmacbook\nlaptop\ngadget\ncellular\ncelular\npart\nlcd\nservis\nic\nflashing\nsoftware\nhardware");
  const [bulkNegativeFilter, setBulkNegativeFilter] = useState("makanan\nminuman\nrestoran\ncafe\nkopi\nbaju\npakaian\nbutik\napotek\nklinik\nrumah sakit\nkosmetik\nskincare\nsembako\nmaterial\nbangunan\nkue\nroti\nwarung\nkelontong\nbuah\nsayur\ndaging\nikan\nayam\ntextile\nkonveksi\nspbu\npasar\nsupermarket\nminimarket\nindomaret\nalfamart\notomotif\nmotor\nmobil\nlaundry\nsalon\nbarbershop\nsekolah\nkursus");
  const [isBulkSearching, setIsBulkSearching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{current: number, total: number, message: string}>({current: 0, total: 0, message: ''});
  const bulkStopRef = useRef(false);
  const [bulkResults, setBulkResults] = useState<(LocationInfo & { placeId: string, locationShortDetails: string })[]>([]);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkPage, setBulkPage] = useState(1);
  const BULK_ITEMS_PER_PAGE = 100;
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (target.closest && target.closest('.genie-modal')) {
        return;
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const [info, setInfo] = useState<LocationInfo | null>(null);
  const [myLoc, setMyLoc] = useState<{lat: number, lng: number} | null>(null);
  const [myLocAccuracy, setMyLocAccuracy] = useState<number | null>(null);
  const [gettingMyLoc, setGettingMyLoc] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [drivingDistance, setDrivingDistance] = useState<number | null>(null);
  const [calculatingDriving, setCalculatingDriving] = useState(false);
  const [config, setConfig] = useState<{googleMapsKeyExists: boolean} | null>(null);
  const { showAlert } = useAlert();
  
  const [savedData, setSavedData] = useState<SavedMapData[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savedRouteDistances, setSavedRouteDistances] = useState<Record<string, number>>({});
  const [distanceProviders, setDistanceProviders] = useState<Record<string, string>>({});
  const [travelMode, setTravelMode] = useState<string>('TWO_WHEELER');

  const [globalSearch, setGlobalSearch] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterAlamat, setFilterAlamat] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [plannedVisitIds, setPlannedVisitIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('mapsAnalyzerPlannedVisits');
      const storedDate = localStorage.getItem('mapsAnalyzerPlannedVisitsDate');
      const todayDate = new Date().toISOString().split('T')[0];
      
      if (stored && storedDate === todayDate) {
         return JSON.parse(stored);
      }
      return [];
    } catch {
      return [];
    }
  });
  const [activeListTab, setActiveListTab] = useState<'semua' | 'rencana' | 'hasil_survey'>('semua');
  const [surveyedStoresSet, setSurveyedStoresSet] = useState<Set<string>>(new Set());
  const [allSurveyData, setAllSurveyData] = useState<any[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedSurveyData, setSelectedSurveyData] = useState<any>(null);
  const [syncingData, setSyncingData] = useState(false);
  const [syncState, setSyncState] = useState<{
     total: number;
     current: number;
     logs: string[];
     isPaused: boolean;
     shouldStop: boolean;
     active: boolean;
  }>({ total: 0, current: 0, logs: [], isPaused: false, shouldStop: false, active: false });
  const syncStateRef = React.useRef(syncState);
  useEffect(() => { syncStateRef.current = syncState; }, [syncState]);
  
  useEffect(() => {
    try {
      localStorage.setItem('mapsAnalyzerPlannedVisits', JSON.stringify(plannedVisitIds));
      localStorage.setItem('mapsAnalyzerPlannedVisitsDate', new Date().toISOString().split('T')[0]);
    } catch {}
  }, [plannedVisitIds]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKecamatan, setEditKecamatan] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [surveyTolerance, setSurveyTolerance] = useState<number>(75);

  useEffect(() => {
    // Load Tolerance from settings
    const loadTolerance = async () => {
       try {
          const { data, error } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'maps_survey_tolerance').single();
          if (data && data.setting_value) {
             setSurveyTolerance(Number(data.setting_value.tolerance || 75));
          }
       } catch (err) {
          console.error('Error loading tolerance settings', err);
       }
    };
    loadTolerance();
  }, []);

  const saveSurveyTolerance = async (val: number) => {
     try {
         const { error } = await supabase.from('app_settings').upsert({
             setting_key: 'maps_survey_tolerance',
             setting_value: { tolerance: val }
         }, { onConflict: 'setting_key' });
         if (error) throw error;
         showAlert('Toleransi Jarak Tersimpan', 'success');
     } catch (err: any) {
         showAlert(`Gagal menyimpan: ${err.message}`, 'error');
     }
  };

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
     isOpen: boolean;
     title: string;
     message: string;
     onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
     setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const startEdit = (item: SavedMapData) => {
     setEditingId(item.id);
     setEditKecamatan(item.kecamatan_kota || '');
     setEditAlamat(item.alamat_lengkap || '');
  };

  const saveEdit = async (id: string) => {
      try {
          const { error } = await supabase
              .from('maps_analyzer')
              .update({ kecamatan_kota: editKecamatan, alamat_lengkap: editAlamat })
              .eq('id', id);
          if (error) throw error;
          showAlert('Data berhasil diperbarui', 'success');
          setEditingId(null);
          fetchSavedData();
      } catch(err) {
          showAlert('Gagal memperbarui data', 'error');
      }
  };
  
  const cancelEdit = () => {
      setEditingId(null);
  };

  useEffect(() => {
    fetchSavedData();
    getMyLocation();
    
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Could not load config", err));
  }, []);

  // Autocomplete debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setPredictions([]);
      setIsSearchingPlaces(false);
      return;
    }
    
    const timeout = setTimeout(async () => {
      setIsSearchingPlaces(true);
      setNextPageTokenPlaces(null);
      try {
        let qs = `q=${encodeURIComponent(searchQuery)}`;
        if (myLoc?.lat && myLoc?.lng) {
            qs += `&lat=${myLoc.lat}&lng=${myLoc.lng}`;
        }
        const res = await fetch(`/api/places/search?${qs}`);
        if (res.ok) {
          const data = await res.json();
          if (data.places) {
            setPredictions(data.places);
            setNextPageTokenPlaces(data.nextPageToken || null);
            setShowPredictions(true);
          }
        }
      } catch (err) {
        console.error("Search places err", err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleLoadMorePlaces = async () => {
    if (!nextPageTokenPlaces || isLoadingMorePlaces) return;
    
    setIsLoadingMorePlaces(true);
    try {
      let qs = `q=${encodeURIComponent(searchQuery)}&pageToken=${encodeURIComponent(nextPageTokenPlaces)}`;
      if (myLoc?.lat && myLoc?.lng) {
          qs += `&lat=${myLoc.lat}&lng=${myLoc.lng}`;
      }
      const res = await fetch(`/api/places/search?${qs}`);
      if (res.ok) {
        const data = await res.json();
        if (data.places) {
          setPredictions(prev => [...prev, ...data.places]);
          setNextPageTokenPlaces(data.nextPageToken || null);
        }
      }
    } catch (err) {
      console.error("Load more err", err);
    } finally {
      setIsLoadingMorePlaces(false);
    }
  };

  const handleSelectPlace = async (place: any) => {
    setSearchQuery(place.displayName?.text || '');
    setShowPredictions(false);
    setPredictions([]);
    
    let address = place.formattedAddress || '';
    let title = place.displayName?.text || '';
    let lat = place.location?.latitude;
    let lng = place.location?.longitude;
    let district = '';
    let city = '';
    
    if (place.addressComponents) {
        const getComponent = (type: string) => {
            const comp = place.addressComponents.find((c: any) => c.types && c.types.includes(type));
            return comp ? comp.longText : null;
        };
        district = getComponent('administrative_area_level_3') || 
                   getComponent('locality') || 
                   getComponent('administrative_area_level_4') || '';
        city = getComponent('administrative_area_level_2') || '';
    }
    
    setInfo({
       finalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${place.id}`,
       lat,
       lng,
       title,
       address,
       district,
       city,
       isApproximate: false,
       placeType: place.primaryTypeDisplayName?.text,
       rating: place.rating,
       userRatingCount: place.userRatingCount
    });
  };

  useEffect(() => {
    if (info?.lat && info?.lng && myLoc?.lat && myLoc?.lng) {
      const fetchDrivingDistance = async () => {
        setCalculatingDriving(true);
        try {
          const res = await fetch('/api/distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               origins: [{ lat: myLoc.lat, lng: myLoc.lng }],
               destinations: [{ lat: info.lat, lng: info.lng }],
               travelMode
            })
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.distances && data.distances[0] !== null) {
              setDrivingDistance(data.distances[0]);
            } else {
              setDrivingDistance(null);
            }
          } else {
            console.error("Distance API Error");
            setDrivingDistance(null);
          }
        } catch (e) {
          console.error("Google Maps Distance Error:", e);
          setDrivingDistance(null);
        } finally {
          setCalculatingDriving(false);
        }
      };
      fetchDrivingDistance();
    } else {
      setDrivingDistance(null);
    }
  }, [info?.lat, info?.lng, myLoc?.lat, myLoc?.lng, travelMode]);

  const fetchSavedData = async () => {
    setLoadingSaved(true);
    
    // Fetch Maps Analyzer Data
    try {
      let allTempData: any[] = [];
      let hasMore = true;
      let from = 0;
      const limit = 500;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('maps_analyzer')
          .select('*')
          // Removed order by created_at because it might cause statement timeout on large unindexed tables
          .range(from, from + limit - 1);
        
        if (error) {
           if (error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('canceling statement')) {
              console.warn('Timeout with 500 limit on maps_analyzer...', error);
              showAlert('Beberapa data maps mungkin tidak termuat sempurna karena query terlalu berat.', 'warning');
              break;
           } else {
              throw error;
           }
        }
        
        if (data && data.length > 0) {
          allTempData = [...allTempData, ...data];
          from += limit;
          if (data.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      setSavedData(allTempData);
    } catch (e: any) {
      console.error(e);
      showAlert(`Gagal memuat data maps: ${e.message}`, 'error');
    }
    
    // Fetch Survey LCD Data
    try {
      let allSurveys: any[] = [];
      let hasMoreSurveys = true;
      let fromSurveys = 0;
      const limit = 500;
      
      while (hasMoreSurveys) {
        const { data, error } = await supabase
          .from('survey_lcd')
          .select('*')
          // Removed order to avoid timeout
          .range(fromSurveys, fromSurveys + limit - 1);
          
        if (error) {
           if (error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('canceling statement')) {
              console.warn('Timeout with 500 limit on survey_lcd...', error);
              showAlert('Beberapa data survey mungkin tidak termuat sempurna karena query terlalu berat.', 'warning');
              break;
           } else {
              throw error;
           }
        }
        
        if (data && data.length > 0) {
           allSurveys = [...allSurveys, ...data];
           fromSurveys += limit;
           if (data.length < limit) hasMoreSurveys = false;
        } else {
           hasMoreSurveys = false;
        }
      }
      
      const namesSet = new Set<string>();
      allSurveys.forEach(s => {
         if (s.nama_toko) {
            namesSet.add(s.nama_toko.toLowerCase().trim());
         }
      });
      setSurveyedStoresSet(namesSet);
      setAllSurveyData(allSurveys);
      
    } catch (e: any) {
      console.error(e);
      showAlert(`Gagal memuat data survey: ${e.message}`, 'error');
    } finally {
      setLoadingSaved(false);
    }
  };



  const getMyLocation = () => {
    setGettingMyLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMyLocAccuracy(pos.coords.accuracy);
        setGettingMyLoc(false);
      },
      (err) => {
        console.error(err);
        setGettingMyLoc(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapsLink) return;

    setLoading(true);
    setInfo(null);
    try {
      const res = await fetch('/api/resolve-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mapsLink })
      });

      if (!res.ok) throw new Error('Gagal memproses link maps');

      const data = await res.json();
      
      let district = null;
      let city = null;
      let address = data.addressFromUrl || null;
      
      // Try to parse district and city from the URL address first (most accurate for Indonesia layout)
      if (address) {
          const kecMatch = address.match(/Kecamatan\s+([^,]+)|Kec\.\s*([^,]+)/i);
          if (kecMatch) district = (kecMatch[1] || kecMatch[2]).trim();
          
          const kotaMatch = address.match(/Kota\s+([^,]+)|Kabupaten\s+([^,]+)|Kab\.\s*([^,]+)/i);
          if (kotaMatch) city = kotaMatch[0].trim();
      }
      
      if (data.lat && data.lng) {
        // Reverse geocoding
        try {
          const geoRes = await fetch(`/api/reverse-geocode?lat=${data.lat}&lng=${data.lng}`);
          if (geoRes.ok) {
             const raw = await geoRes.json();
             if (raw.provider === 'google' && raw.data.results && raw.data.results[0]) {
                if (!address) address = raw.data.results[0].formatted_address;
                const getComponent = (type: string) => {
                    const comp = raw.data.results[0].address_components.find((c: any) => c.types && c.types.includes(type));
                    return comp ? comp.long_name : null;
                };
                district = getComponent('administrative_area_level_3') || getComponent('locality') || getComponent('administrative_area_level_4') || district;
                city = getComponent('administrative_area_level_2') || city;
             } else if (raw.provider === 'nominatim' && raw.data) {
                if (!address) address = raw.data.display_name;
                if (!district) district = raw.data.address?.subdistrict || raw.data.address?.city_district || raw.data.address?.town || raw.data.address?.village || raw.data.address?.suburb;
                if (!city) city = raw.data.address?.city || raw.data.address?.county || raw.data.address?.state_district;
             }
          }
        } catch (e) {
          console.error(e);
        }
      } else if (data.addressForGeocode) {
        // Forward geocoding
        try {
          const addressParts = data.addressForGeocode.split(',').map((p: string) => p.trim()).filter(Boolean);
          for (let i = 0; i < addressParts.length; i++) {
             const query = (i === 0 ? addressParts : addressParts.slice(i)).join(', ');
             const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
             
             if (geoRes.ok) {
               const raw = await geoRes.json();
               if (raw.provider === 'google' && raw.data.results && raw.data.results.length > 0) {
                 const geoData = raw.data.results[0];
                 data.lat = geoData.geometry.location.lat;
                 data.lng = geoData.geometry.location.lng;
                 data.isApproximate = true; 
                 if (!address) address = geoData.formatted_address;
                 const getComponent = (type: string) => {
                     const comp = geoData.address_components.find((c: any) => c.types && c.types.includes(type));
                     return comp ? comp.long_name : null;
                 };
                 district = getComponent('administrative_area_level_3') || getComponent('locality') || getComponent('administrative_area_level_4') || district;
                 city = getComponent('administrative_area_level_2') || city;
                 break;
               } else if (raw.provider === 'nominatim' && raw.data && raw.data.length > 0) {
                 const geoData = raw.data[0];
                 data.lat = parseFloat(geoData.lat);
                 data.lng = parseFloat(geoData.lon);
                 data.isApproximate = true; 
                 if (!address) address = geoData.display_name;
                 if (!district) district = geoData.address?.subdistrict || geoData.address?.city_district || geoData.address?.town || geoData.address?.village || geoData.address?.suburb;
                 if (!city) city = geoData.address?.city || geoData.address?.county || geoData.address?.state_district;
                 break;
               }
             }
             await new Promise(r => setTimeout(r, 600));
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!address && data.addressFromUrl) {
         address = data.addressFromUrl;
      }

      setInfo({
         finalUrl: data.finalUrl,
         lat: data.lat,
         lng: data.lng,
         title: data.title,
         address,
         district,
         city
      });
      
      if (!myLoc) {
        getMyLocation();
      }

    } catch (err: any) {
      console.error(err);
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSearch = async () => {
    if (!bulkArea.trim()) {
        showAlert('Silakan isi wilayah target (Kelurahan/Kecamatan/Kota).', 'error');
        return;
    }
    
    const keywords = bulkKeywords.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    if (keywords.length === 0) {
        showAlert('Daftar kata kunci tidak boleh kosong.', 'error');
        return;
    }
    
    const posKeywords = bulkPositiveFilter.split('\n').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    const negKeywords = bulkNegativeFilter.split('\n').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

    setIsBulkSearching(true);
    bulkStopRef.current = false;
    
    setBulkResults([]);
    setSelectedBulkIds([]);
    
    const allResultsMap: Record<string, LocationInfo & { placeId: string, locationShortDetails: string }> = {};
    let wasFallback = false;
    
    setBulkProgress({
      current: 0,
      total: keywords.length,
      message: 'Memulai pencarian masal...'
    });

    for (let i = 0; i < keywords.length; i++) {
        if (bulkStopRef.current) break;
        
        const kw = keywords[i];
        let query = `${kw} di ${bulkArea}`;
        
        setBulkProgress({
          current: i + 1,
          total: keywords.length,
          message: `Mencari: ${query}`
        });

        let currentToken: string | null = null;
        let pageCount = 0;
        
        do {
            if (bulkStopRef.current) break;
            
            try {
                let qs = `q=${encodeURIComponent(query)}`;
                if (currentToken) qs += `&pageToken=${encodeURIComponent(currentToken)}`;
                if (myLoc?.lat && myLoc?.lng) {
                    qs += `&lat=${myLoc.lat}&lng=${myLoc.lng}`;
                }
                
                const res = await fetch(`/api/places/search?${qs}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.isFallback) wasFallback = true;
                    if (data.places && data.places.length > 0) {
                        for (const place of data.places) {
                            if (bulkStopRef.current) break;
                            if (allResultsMap[place.id]) continue;
                            
                            let title = place.displayName?.text || '';
                            let placeType = place.primaryTypeDisplayName?.text || '';
                            let titleLower = title.toLowerCase();
                            let typeLower = placeType.toLowerCase();
                            
                            // 1. Negative check
                            let isNegative = false;
                            for (const neg of negKeywords) {
                                if (titleLower.includes(neg) || typeLower.includes(neg)) {
                                    isNegative = true;
                                    break;
                                }
                            }
                            if (isNegative) continue;
                            
                            // 2. Positive check
                            if (posKeywords.length > 0) {
                                let isPositive = false;
                                for (const pos of posKeywords) {
                                    if (titleLower.includes(pos) || typeLower.includes(pos)) {
                                        isPositive = true;
                                        break;
                                    }
                                }
                                if (!isPositive) continue;
                            }
                            
                            let address = place.formattedAddress || '';
                            let lat = place.location?.latitude || null;
                            let lng = place.location?.longitude || null;
                            let district = '';
                            let city = '';
                            
                            if (place.addressComponents) {
                                const getComponent = (type: string) => {
                                    const comp = place.addressComponents.find((c: any) => c.types && c.types.includes(type));
                                    return comp ? comp.longText : null;
                                };
                                district = getComponent('administrative_area_level_3') || 
                                           getComponent('locality') || 
                                           getComponent('administrative_area_level_4') || '';
                                city = getComponent('administrative_area_level_2') || '';
                            }

                            const locInfo: LocationInfo & { placeId: string, locationShortDetails: string } = {
                               placeId: place.id,
                               locationShortDetails: [district, city].filter(Boolean).join(', '),
                               finalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${place.id}`,
                               lat,
                               lng,
                               title,
                               address,
                               district,
                               city,
                               isApproximate: false,
                               placeType: place.primaryTypeDisplayName?.text,
                               rating: place.rating,
                               userRatingCount: place.userRatingCount
                            };
                            
                            // Cek duplikat DB lokal
                            const isDuplicate = savedData.some(item => {
                               const isSameUrl = item.final_url === locInfo.finalUrl;
                               const isSameNameAndCity = item.nama_customer?.toLowerCase() === locInfo.title?.toLowerCase() && 
                                                         item.kecamatan_kota?.toLowerCase() === locInfo.city?.toLowerCase();
                               const isSameAddress = item.alamat_lengkap?.toLowerCase() === locInfo.address?.toLowerCase();
                               
                               return isSameUrl || isSameNameAndCity || (isSameAddress && item.alamat_lengkap);
                            });
                            
                            if (!isDuplicate) {
                               allResultsMap[place.id] = locInfo;
                            }
                        }
                    }
                    currentToken = data.nextPageToken || null;
                    pageCount++;
                } else {
                    break;
                }
            } catch (err) {
                console.error("Bulk search err", err);
                break;
            }
            
            // Artificial delay to prevent aggressive rate limiting
            await new Promise(r => setTimeout(r, 1000));
        } while (currentToken && pageCount < 3); // Max 3 pages per keyword (~60 results)
    }

    const unqiueResults = Object.values(allResultsMap);
    setBulkResults(unqiueResults);
    setSelectedBulkIds(unqiueResults.map(r => r.placeId));

    setBulkProgress({
      current: keywords.length,
      total: keywords.length,
      message: unqiueResults.length > 0 ? `Selesai! Ditemukan ${unqiueResults.length} lokasi unik. Silahkan pilih dan simpan.` : `Selesai. Tidak ada hasil.`
    });
    setIsBulkSearching(false);
    
    if (unqiueResults.length === 0) {
        if (wasFallback) {
            showAlert('Tidak ada hasil ditemukan. Catatan: Karena Google Maps API Key tidak diatur, aplikasi menggunakan server OSM yang mungkin kurang akurat untuk pencarian kategori bisnis secara masal.', 'error');
        } else {
            showAlert('Tidak ada hasil ditemukan dari kata kunci pencarian masal Anda.', 'error');
        }
    } else if (unqiueResults.length > 0) {
        showAlert(`Pencarian masal selesai! Ditemukan ${unqiueResults.length} data. Silahkan periksa daftar di bawah.`, 'success');
    }
  };
  
  const handleSaveSelectedBulk = async () => {
     if (selectedBulkIds.length === 0) {
        showAlert('Tidak ada lokasi yang dipilih untuk disimpan', 'error');
        return;
     }

     setIsBulkSaving(true);
     let totalSaved = 0;
     const toSave = bulkResults.filter(r => selectedBulkIds.includes(r.placeId));
     
     for (const loc of toSave) {
        const success = await performSave(loc, true);
        if (success) {
            totalSaved++;
        }
     }
     
     setIsBulkSaving(false);
     showAlert(`${totalSaved} lokasi berhasil disimpan.`, 'success');
     setBulkResults([]);
     setSelectedBulkIds([]);
     setBulkKeywords("Service hp\nSmartphone service\nSmartphone repair\nService handphone\nService iphone\nService android\nReparasi ponsel\nReparasi hp\nBengkel hp\nBengkel iphone\nService ponsel\nReparasi handphone\nSparepart hp\nSparepart handphone\nSparepart android\nServis hp\nServis handphone\nServis iphone\nServis android\nReparasi iphone\nReparasi android");
     setBulkProgress({current: 0, total: 0, message: ''});
     fetchSavedData();
  };

  const performSave = async (dataToSave: LocationInfo, isSilent: boolean = false) => {
    // Validasi Duplikat List Lokal / DB
    const isDuplicate = savedData.some(item => {
      const isSameUrl = item.final_url === dataToSave.finalUrl;
      const isSameNameAndDistrict = item.nama_customer.toLowerCase() === (dataToSave.title || 'Tanpa Nama').toLowerCase() && 
                                    item.kecamatan_kota.toLowerCase() === ((dataToSave.district ? dataToSave.district + ', ' : '') + (dataToSave.city || '')).toLowerCase() && 
                                    item.nama_customer !== 'Tanpa Nama';
      const isSameAddress = item.alamat_lengkap !== '' && item.alamat_lengkap.toLowerCase() === (dataToSave.address || '').toLowerCase();
      const isSameLocation = item.lat !== null && item.lat === dataToSave.lat && item.lng === dataToSave.lng;
      
      return isSameUrl || isSameNameAndDistrict || isSameAddress || isSameLocation;
    });

    if (isDuplicate) {
      if (!isSilent) showAlert('Data ini terdeteksi sebagai duplikat berdasarkan Link, Nama & Kota, Alamat, atau Titik Koordinat.', 'error');
      return false;
    }

    if (!isSilent) setSaving(true);
    try {
      // Validasi tambahan via DB query untuk memastikan
      const { data: existingData } = await supabase
        .from('maps_analyzer')
        .select('id')
        .eq('final_url', dataToSave.finalUrl)
        .limit(1);

      if (existingData && existingData.length > 0) {
        if (!isSilent) showAlert('Link lokasi ini sudah pernah disimpan di database.', 'error');
        if (!isSilent) setSaving(false);
        return false;
      }

      const { error } = await supabase.from('maps_analyzer').insert([{
        nama_customer: dataToSave.title || 'Tanpa Nama',
        kecamatan_kota: (dataToSave.district ? dataToSave.district + ', ' : '') + (dataToSave.city || ''),
        alamat_lengkap: dataToSave.address || '',
        lat: dataToSave.lat,
        lng: dataToSave.lng,
        final_url: dataToSave.finalUrl,
        rating: dataToSave.rating || null,
        user_rating_count: dataToSave.userRatingCount || null,
        place_type: dataToSave.placeType || null
      }]);
      
      if (error) throw error;
      
      if (!isSilent) showAlert('Data berhasil disimpan ke database', 'success');
      return true;
    } catch (err: any) {
      console.error(err);
      if (!isSilent) showAlert(err.message, 'error');
      return false;
    } finally {
      if (!isSilent) setSaving(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!info) return;
    const success = await performSave(info);
    if (success) {
      setInfo(null);
      setMapsLink('');
      fetchSavedData();
    }
  };

  const handleDirectSave = async (place: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    let address = place.formattedAddress || '';
    let title = place.displayName?.text || '';
    let lat = place.location?.latitude || null;
    let lng = place.location?.longitude || null;
    let district = '';
    let city = '';
    
    if (place.addressComponents) {
        const getComponent = (type: string) => {
            const comp = place.addressComponents.find((c: any) => c.types && c.types.includes(type));
            return comp ? comp.longText : null;
        };
        district = getComponent('administrative_area_level_3') || 
                   getComponent('locality') || 
                   getComponent('administrative_area_level_4') || '';
        city = getComponent('administrative_area_level_2') || '';
    }

    const locInfo: LocationInfo = {
       finalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${place.id}`,
       lat,
       lng,
       title,
       address,
       district,
       city,
       isApproximate: false,
       placeType: place.primaryTypeDisplayName?.text,
       rating: place.rating,
       userRatingCount: place.userRatingCount
    };

    const success = await performSave(locInfo);
    if (success) {
       fetchSavedData();
       // Optional: close predictions or keep it open so user can save more
    }
  };

  const handleDelete = (id: string) => {
    showConfirm('Konfirmasi Hapus', 'Yakin ingin menghapus data ini?', async () => {
      try {
        const { error } = await supabase.from('maps_analyzer').delete().eq('id', id);
        if (error) throw error;
        fetchSavedData();
      } catch (err: any) {
         console.error(err);
         showAlert('Gagal menghapus data', 'error');
      }
    });
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    showConfirm('Konfirmasi Hapus Massal', `Yakin ingin menghapus ${selectedIds.length} data terpilih?`, async () => {
      setDeletingBulk(true);
      try {
        const chunkSize = 50;
        for (let i = 0; i < selectedIds.length; i += chunkSize) {
          const chunk = selectedIds.slice(i, i + chunkSize);
          const { error } = await supabase.from('maps_analyzer').delete().in('id', chunk);
          if (error) throw error;
        }
        
        setSelectedIds([]);
        fetchSavedData();
        showAlert('Berhasil menghapus data masal', 'success');
      } catch (err: any) {
         console.error(err);
         showAlert(`Gagal menghapus data masal: ${err.message}`, 'error');
      } finally {
         setDeletingBulk(false);
      }
    });
  };

  const handleResetFilters = () => {
    setGlobalSearch('');
    setFilterName('');
    setFilterKecamatan('');
    setFilterAlamat('');
    setShowDuplicatesOnly(false);
    setSelectedIds([]);
  };

  const handleSyncKecamatanKota = () => {
    const msg = selectedIds.length > 0
       ? `Fitur ini akan memproses ulang kolom Kecamatan/Kota dan Alamat Lengkap untuk ${selectedIds.length} data terpilih. Lanjutkan?`
       : 'Fitur ini akan memproses ulang kolom Kecamatan/Kota dan Alamat Lengkap untuk SEMUA data berdasarkan koordinat. Lanjutkan?';

    showConfirm('Konfirmasi Sinkronisasi', msg, async () => {
       setSyncingData(true);
       setSyncState({ total: 0, current: 0, logs: [], isPaused: false, shouldStop: false, active: true });

       let updateCount = 0;
       let skippedCount = 0;
       let errCount = 0;

       try {
         let allData: any[] = [];
         if (selectedIds.length > 0) {
           const chunkSize = 50;
           for (let i = 0; i < selectedIds.length; i += chunkSize) {
             const chunk = selectedIds.slice(i, i + chunkSize);
             const { data, error } = await supabase.from('maps_analyzer').select('id, nama_customer, alamat_lengkap, kecamatan_kota, lat, lng').in('id', chunk);
             if (error) throw error;
             if (data) allData.push(...data);
           }
         } else {
           const { data, error } = await supabase.from('maps_analyzer').select('id, nama_customer, alamat_lengkap, kecamatan_kota, lat, lng');
           if (error) throw error;
           if (data) allData = data;
         }
         
         const data = allData;
         
         if (data && data.length > 0) {
        setSyncState(prev => ({ ...prev, total: data.length }));
        
        for (let i = 0; i < data.length; i++) {
          // Check for pause/stop
          while (syncStateRef.current.isPaused && !syncStateRef.current.shouldStop) {
            await new Promise(r => setTimeout(r, 500));
          }
          if (syncStateRef.current.shouldStop) {
             showAlert(`Proses dihentikan. Update: ${updateCount}, Tetap sama: ${skippedCount}, Error: ${errCount}`, 'info');
             break;
          }

          const item = data[i];
          setSyncState(prev => ({ ...prev, current: i + 1 }));

          try {
            let district = '';
            let city = '';
            let newAddress = '';

            if (item.lat && item.lng) {
               const geoRes = await fetch(`/api/reverse-geocode?lat=${item.lat}&lng=${item.lng}`);
               if (geoRes.ok) {
                  const raw = await geoRes.json();
                  if (raw.provider === 'google' && raw.data.results && raw.data.results[0]) {
                     newAddress = raw.data.results[0].formatted_address;
                     const getComponent = (type: string) => {
                         const comp = raw.data.results[0].address_components.find((c: any) => c.types && c.types.includes(type));
                         return comp ? comp.long_name : null;
                     };
                     district = getComponent('administrative_area_level_3') || getComponent('locality') || getComponent('administrative_area_level_4') || '';
                     city = getComponent('administrative_area_level_2') || '';
                  } else if (raw.provider === 'nominatim' && raw.data) {
                     newAddress = raw.data.display_name;
                     district = raw.data.address?.subdistrict || raw.data.address?.city_district || raw.data.address?.town || raw.data.address?.village || raw.data.address?.suburb || '';
                     city = raw.data.address?.city || raw.data.address?.county || raw.data.address?.state_district || '';
                  }
               }
            } else if (item.alamat_lengkap) {
               const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(item.alamat_lengkap)}`);
               if (geoRes.ok) {
                   const raw = await geoRes.json();
                   if (raw.provider === 'google' && raw.data.results && raw.data.results[0]) {
                      newAddress = raw.data.results[0].formatted_address;
                      const getComponent = (type: string) => {
                          const comp = raw.data.results[0].address_components.find((c: any) => c.types && c.types.includes(type));
                          return comp ? comp.long_name : null;
                      };
                      district = getComponent('administrative_area_level_3') || getComponent('locality') || getComponent('administrative_area_level_4') || '';
                      city = getComponent('administrative_area_level_2') || '';
                   } else if (raw.provider === 'nominatim' && raw.data && raw.data.length > 0) {
                      newAddress = raw.data[0].display_name;
                      district = raw.data[0].address?.subdistrict || raw.data[0].address?.city_district || raw.data[0].address?.town || raw.data[0].address?.village || raw.data[0].address?.suburb || '';
                      city = raw.data[0].address?.city || raw.data[0].address?.county || raw.data[0].address?.state_district || '';
                   }
               }
            }

            const newKecamatanKota = (district ? district + ', ' : '') + city;
            
            const isAddressDifferent = newAddress && newAddress !== item.alamat_lengkap;
            const isKecamatanDifferent = newKecamatanKota && newKecamatanKota !== item.kecamatan_kota;

            if (isAddressDifferent || isKecamatanDifferent) {
                const updates: any = {};
                if (isAddressDifferent) updates.alamat_lengkap = newAddress;
                if (isKecamatanDifferent) updates.kecamatan_kota = newKecamatanKota;

                const { error: updateError } = await supabase
                    .from('maps_analyzer')
                    .update(updates)
                    .eq('id', item.id);
                    
                if (updateError) {
                    console.error("Update Error ID", item.id, updateError);
                    errCount++;
                    setSyncState(prev => ({ ...prev, logs: [`[Error] Gagal update ${item.nama_customer || 'Toko'}`, ...prev.logs].slice(0, 10) }));
                } else {
                    updateCount++;
                    setSyncState(prev => ({ ...prev, logs: [`[Sukses] Diperbarui: ${item.nama_customer || 'Toko'}`, ...prev.logs].slice(0, 10) }));
                }
            } else {
                skippedCount++;
                setSyncState(prev => ({ ...prev, logs: [`[Lewati] Tidak ada perubahan: ${item.nama_customer || 'Toko'}`, ...prev.logs].slice(0, 5) }));
            }
            
            await new Promise(r => setTimeout(r, 200));

          } catch (e) {
            console.error("Failed item sync", item.id, e);
            errCount++;
            setSyncState(prev => ({ ...prev, logs: [`[Error] Kesalahan pada ${item.nama_customer || 'Toko'}`, ...prev.logs].slice(0, 10) }));
          }
        }
        
        if (!syncStateRef.current.shouldStop) {
            showAlert(`Selesai! Update: ${updateCount}, Tetap sama: ${skippedCount}, Error: ${errCount}`, 'success');
        }
        fetchSavedData();
      } else {
        showAlert('Tidak ada data yang perlu disinkronisasi', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal melakukan sinkronisasi data secara keseluruhan', 'error');
    } finally {
      setSyncingData(false);
      setSyncState(prev => ({...prev, active: false}));
    }
    }); // End of showConfirm
  };

  // Add distance to saved data if location available
  const dataWithDistances = savedData.map(item => {
    let distance = null;
    let isOsrm = false;
    let provider = '';
    
    if (savedRouteDistances[item.id]) {
      distance = savedRouteDistances[item.id];
      isOsrm = true;
      provider = distanceProviders[item.id] || 'api';
    } else if (myLoc && item.lat && item.lng) {
      distance = calculateDistance(myLoc.lat, myLoc.lng, item.lat, item.lng);
      provider = 'straight_line';
    }
    return { ...item, distance, isOsrm, provider };
  }).sort((a, b) => {
    if (a.distance !== null && b.distance !== null) {
      return a.distance - b.distance;
    }
    return 0;
  });

  const duplicateGroupIds = new Set<string>();
  if (showDuplicatesOnly) {
     for (let i = 0; i < dataWithDistances.length; i++) {
        for (let j = i + 1; j < dataWithDistances.length; j++) {
            const itemA = dataWithDistances[i];
            const itemB = dataWithDistances[j];
            
            const isSameName = itemA.nama_customer.toLowerCase() === itemB.nama_customer.toLowerCase() && itemA.nama_customer !== 'Tanpa Nama';
            const isSameKecKota = itemA.kecamatan_kota.toLowerCase() === itemB.kecamatan_kota.toLowerCase();
            const isSameAddress = itemA.alamat_lengkap !== '' && itemA.alamat_lengkap.toLowerCase() === itemB.alamat_lengkap.toLowerCase();
            const isSameLocation = itemA.lat !== null && itemA.lat === itemB.lat && itemA.lng === itemB.lng;
            const isSameJarak = itemA.distance !== null && itemA.distance === itemB.distance && itemA.distance > 0;
            const isSameUrl = itemA.final_url !== '' && itemA.final_url === itemB.final_url;
            
            if ((isSameName && isSameKecKota) || isSameAddress || isSameLocation || isSameJarak || isSameUrl) {
                duplicateGroupIds.add(itemA.id);
                duplicateGroupIds.add(itemB.id);
            }
        }
     }
  }

  const filteredData = dataWithDistances.filter(item => {
    if (activeListTab === 'rencana' && !plannedVisitIds.includes(item.id)) return false;
    
    if (showDuplicatesOnly && !duplicateGroupIds.has(item.id)) return false;

    const searchString = `${item.nama_customer || ''} ${item.kecamatan_kota || ''} ${item.alamat_lengkap || ''} ${item.distance || ''}`.toLowerCase();
    
    if (globalSearch && !searchString.includes(globalSearch.toLowerCase())) return false;
    if (filterName && !(item.nama_customer || '').toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterKecamatan && !(item.kecamatan_kota || '').toLowerCase().includes(filterKecamatan.toLowerCase())) return false;
    if (filterAlamat && !(item.alamat_lengkap || '').toLowerCase().includes(filterAlamat.toLowerCase())) return false;
    
    return true;
  });

  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, filterName, filterKecamatan, filterAlamat, showDuplicatesOnly, dataWithDistances]);

  const handleDownloadExcel = () => {
    if (filteredData.length === 0) {
      showAlert('Tidak ada data untuk didownload', 'warning');
      return;
    }

    const wsData = filteredData.map((item, index) => ({
      'No': index + 1,
      'Nama Toko': item.nama_customer || '-',
      'Kecamatan/Kota': item.kecamatan_kota || '-',
      'Alamat Lengkap': item.alamat_lengkap || '-',
      'Titik Koordinat': item.lat && item.lng ? `${item.lat}, ${item.lng}` : '-',
      'Jarak': item.distance ? `${item.distance.toFixed(2)} km` : '-',
      'Estimasi Perjalanan': item.distance ? `${Math.ceil((item.distance / (travelMode === 'TWO_WHEELER' ? 30 : 40)) * 60)} mnt` : '-',
      'Status Survey': surveyedStoresSet.has((item.nama_customer || '').toLowerCase().trim()) ? 'Sudah disurvey' : 'Belum disurvey',
      'Link Google Maps': item.final_url || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    const colWidths = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 40 },
      { wch: 20 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
      { wch: 40 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Kunjungan');

    const fileName = activeListTab === 'rencana' ? 'Daftar_Rencana_Kunjungan.xlsx' : 'Daftar_Semua_Kunjungan.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  const buildHtml = () => {
    if (filteredData.length === 0) {
      showAlert('Tidak ada data untuk didownload', 'warning');
      return null;
    }

    const initialData = filteredData.map(item => {
      const storeNameLower = (item.nama_customer || '').toLowerCase().trim();
      const storeSurveys = allSurveyData.filter(s => s.nama_toko && s.nama_toko.toLowerCase().trim() === storeNameLower);
      
      // Sort surveys by created_at descending to get the latest
      storeSurveys.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      
      const latestSurvey = storeSurveys[0] || null;
      let lastVisitDate = '-';
      if (latestSurvey && latestSurvey.created_at) {
         lastVisitDate = new Date(latestSurvey.created_at).toLocaleDateString('id-ID', {day: '2-digit', month:'short', year:'numeric'});
      }
      
      return {
        id: item.id,
        nama_customer: item.nama_customer || '-',
        kecamatan_kota: item.kecamatan_kota || '-',
        alamat_lengkap: item.alamat_lengkap || '-',
        lat: item.lat,
        lng: item.lng,
        final_url: item.final_url || '',
        is_surveyed: surveyedStoresSet.has(storeNameLower),
        is_rencana: plannedVisitIds.includes(item.id),
        survey_count: storeSurveys.length,
        last_visit_date: lastVisitDate,
        latest_survey: latestSurvey ? {
           brand_lcd: latestSurvey.brand_lcd || '-',
           qty_lcd: latestSurvey.qty_lcd || '0',
           omset_lcd: latestSurvey.omset_lcd || '0',
           brand_baterai: latestSurvey.brand_baterai || '-',
           qty_baterai: latestSurvey.qty_baterai || '0',
           omset_baterai: latestSurvey.omset_baterai || '0',
        } : null
      };
    });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Database Customer LCD</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #f1f5f9; -webkit-tap-highlight-color: transparent; }
    .loader { border: 2px solid #fff; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; }
    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 pb-24">

  <!-- Salesman Login Screen -->
  <div id="loginScreen" class="fixed inset-0 bg-slate-100 z-[9999] flex flex-col items-center justify-center p-6 transition-opacity duration-300">
    <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm transform transition-transform">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i class="fa-solid fa-user-tie"></i></div>
        <h2 class="text-xl font-black text-slate-800">Login Salesman</h2>
        <p class="text-sm text-slate-500 mt-1">Masukkan kode salesman Anda</p>
      </div>
      <input type="text" id="salesmanCodeInput" class="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold" placeholder="Contoh: SL001" autocomplete="off" />
      <button id="loginBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex justify-center items-center gap-2">
        <i class="fa-solid fa-right-to-bracket"></i> Masuk
      </button>
    </div>
  </div>

  <!-- Fixed Top Header -->
  <div class="sticky top-0 z-40 bg-white shadow-sm px-4 py-3">
    <div class="flex justify-between items-center mb-3">
      <h1 class="text-xl font-bold text-indigo-700"><i class="fa-solid fa-map-location-dot mr-2"></i>Database Customer LCD</h1>
      <span class="text-xs text-slate-500 font-medium" id="lastSyncTime">Sync: -</span>
    </div>
    
    <div class="flex gap-2 mb-3">
      <button id="refreshLocBtn" class="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[11px] sm:text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 sm:gap-2 transition-colors">
        <i class="fa-solid fa-location-crosshairs"></i> Refresh <span class="loader hidden w-4 h-4 border-2" id="locLoader"></span>
      </button>
      <button id="syncDbBtn" class="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] sm:text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 sm:gap-2 transition-colors">
        <i class="fa-solid fa-cloud-arrow-down"></i> Sync DB <span class="loader hidden w-4 h-4 border-2" id="syncLoader"></span>
      </button>
    </div>

    <div class="relative">
      <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
      <input type="text" id="searchInput" class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Cari apa saja...">
    </div>
    <div id="searchCountContainer" class="hidden text-xs font-semibold text-slate-500 mt-2 px-1">
      Menampilkan <span id="searchCount" class="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">0</span> toko
    </div>
    
    <!-- Compass Block (Hidden untill loc refresh) -->
    <div id="compassContainer" class="hidden mt-3 mb-1">
      <div class="flex items-center justify-between mb-2 px-1">
         <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter Arah</div>
         <button onclick="window.requestCompass()" class="text-indigo-600 font-bold text-[10px] sm:text-xs flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200 transition-colors shadow-sm">
            <i class="fa-regular fa-compass"></i>
            <span>Sensor Arah Utara:</span>
            <div class="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-indigo-200 shadow-sm ml-0.5">
               <i id="northArrow" class="fa-solid fa-arrow-up leading-none text-indigo-500 transition-transform duration-200" style="transform: rotate(0deg); transform-origin: center;"></i>
            </div>
         </button>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <button onclick="window.filterDirection('Utara')" class="flex flex-col items-center justify-center py-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 hover:bg-orange-100 transition-colors shadow-sm relative overflow-hidden">
           <i class="fa-solid fa-arrow-up text-orange-400/50 absolute top-1.5 right-1.5 text-xs"></i>
           <span class="text-[10px] font-bold uppercase mb-0.5 relative z-10 text-orange-800">Utara</span>
           <span class="text-sm font-black relative z-10" id="dirCountUtara">0</span>
        </button>
        <button onclick="window.filterDirection('Timur')" class="flex flex-col items-center justify-center py-2 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-700 hover:bg-cyan-100 transition-colors shadow-sm relative overflow-hidden">
           <i class="fa-solid fa-arrow-right text-cyan-400/50 absolute top-1.5 right-1.5 text-xs"></i>
           <span class="text-[10px] font-bold uppercase mb-0.5 relative z-10 text-cyan-800">Timur</span>
           <span class="text-sm font-black relative z-10" id="dirCountTimur">0</span>
        </button>
        <button onclick="window.filterDirection('Selatan')" class="flex flex-col items-center justify-center py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100 transition-colors shadow-sm relative overflow-hidden">
           <i class="fa-solid fa-arrow-down text-rose-400/50 absolute top-1.5 right-1.5 text-xs"></i>
           <span class="text-[10px] font-bold uppercase mb-0.5 relative z-10 text-rose-800">Selatan</span>
           <span class="text-sm font-black relative z-10" id="dirCountSelatan">0</span>
        </button>
        <button onclick="window.filterDirection('Barat')" class="flex flex-col items-center justify-center py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm relative overflow-hidden">
           <i class="fa-solid fa-arrow-left text-emerald-400/50 absolute top-1.5 right-1.5 text-xs"></i>
           <span class="text-[10px] font-bold uppercase mb-0.5 relative z-10 text-emerald-800">Barat</span>
           <span class="text-sm font-black relative z-10" id="dirCountBarat">0</span>
        </button>
      </div>
      <div id="activeDirectionFilterBlock" class="hidden items-center justify-between text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg mt-2 shadow-sm">
        <span><i class="fa-solid fa-compass mr-1.5"></i> Arah: <span id="activeDirName" class="text-amber-400">Utara</span> - <span id="activeDirCount" class="font-normal text-slate-300">0</span> toko</span>
        <button onclick="window.clearDirectionFilter()" class="text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded px-2 py-1"><i class="fa-solid fa-xmark"></i> Tutup</button>
      </div>
      <div id="activeRouteFilterBlock" class="hidden items-center justify-between text-xs font-bold bg-indigo-800 text-white px-3 py-2 rounded-lg mt-2 shadow-sm">
        <div class="flex flex-col">
           <span><i class="fa-solid fa-route mr-1.5 text-indigo-300"></i> Searah menuju:</span>
           <span id="activeRouteName" class="text-indigo-200 mt-0.5 line-clamp-1">Tujuan</span>
           <span class="font-normal text-slate-300 mt-0.5"><span id="activeRouteCount">0</span> toko searah (< 3km)</span>
        </div>
        <button onclick="window.clearRouteFilter()" class="text-indigo-200 hover:text-white border border-indigo-600 hover:border-indigo-400 rounded px-2 py-1 ml-2"><i class="fa-solid fa-xmark"></i> Tutup</button>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="bg-white border-b sticky top-[135px] sm:top-[124px] z-30 shadow-sm overflow-x-auto no-scrollbar" id="tabContainerOuter">
    <div class="flex px-3 py-2.5 gap-2 w-max" id="tabContainer">
      <button data-tab="semua" class="tab-btn active bg-indigo-100 text-indigo-700 border-indigo-200 border px-4 py-1.5 rounded-full text-sm font-semibold transition-colors">Semua</button>
      <button data-tab="rencana" class="tab-btn bg-white text-slate-600 border-slate-200 border hover:bg-slate-50 px-4 py-1.5 rounded-full text-sm font-medium transition-colors">Rencana Hari Ini</button>
      <button data-tab="belum" class="tab-btn bg-white text-slate-600 border-slate-200 border hover:bg-slate-50 px-4 py-1.5 rounded-full text-sm font-medium transition-colors">Belum Dikunjungi</button>
      <button data-tab="sudah" class="tab-btn bg-white text-slate-600 border-slate-200 border hover:bg-slate-50 px-4 py-1.5 rounded-full text-sm font-medium transition-colors">Riwayat (Sudah)</button>
    </div>
  </div>

  <div class="p-3" id="listContainer">
    <!-- List renders here -->
  </div>

  <!-- Survey Modal Container -->
  <div id="surveyModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm hidden flex flex-col justify-end sm:justify-center sm:px-4 sm:py-10 transition-opacity">
    <div class="bg-white w-full sm:max-w-xl sm:mx-auto h-[90vh] sm:h-auto sm:max-h-full rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative animate-slideUp sm:animate-none">
       <!-- Header -->
       <div class="bg-indigo-600 text-white px-4 py-4 flex justify-between items-center shadow-md z-1">
         <h2 class="text-lg font-bold"><i class="fa-solid fa-clipboard-check mr-2"></i>Survey Kunjungan</h2>
         <button id="closeModalBtn" class="text-white/80 hover:text-white p-1 text-xl"><i class="fa-solid fa-xmark"></i></button>
       </div>
       
       <!-- Form Content -->
       <div class="p-4 overflow-y-auto flex-1 bg-slate-50">
         <form id="surveyForm" class="space-y-4">
            <input type="hidden" id="sv_id">
            <input type="hidden" id="sv_lat">
            <input type="hidden" id="sv_lng">
            
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <div class="space-y-1 mb-3">
                  <label class="text-xs font-bold text-slate-500 uppercase">Nama Toko</label>
                  <input type="text" id="sv_nama_toko" class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800" readonly>
                </div>
                <div class="space-y-1 mb-3">
                  <label class="text-xs font-bold text-slate-500 uppercase">Alamat Asli (GPS)</label>
                  <textarea id="sv_alamat" class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700" rows="2" readonly></textarea>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-bold text-slate-700 uppercase">No Telepon Toko</label>
                  <input type="tel" id="sv_no_telp" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0812xxxx">
                </div>
            </div>
            
            <div class="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-3 shadow-sm">
              <h3 class="font-bold text-blue-800 flex items-center gap-2"><i class="fa-solid fa-mobile-screen"></i> Data LCD</h3>
              <div>
                <label class="text-xs text-slate-600 block mb-1">Brand LCD di Toko</label>
                <input type="text" id="sv_brand_lcd" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-600 block mb-1">Qty (Bulan)</label>
                  <input type="number" id="sv_qty_lcd" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400">
                </div>
                <div>
                  <label class="text-xs text-slate-600 block mb-1">Est Omset (Rp)</label>
                  <input type="number" id="sv_omset_lcd" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400">
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-600 block mb-1">Order Dari Mana?</label>
                <input type="text" id="sv_order_lcd_dari" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400">
              </div>
            </div>

            <div class="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-3 shadow-sm">
              <h3 class="font-bold text-emerald-800 flex items-center gap-2"><i class="fa-solid fa-battery-full"></i> Data Baterai</h3>
              <div>
                <label class="text-xs text-slate-600 block mb-1">Brand Baterai di Toko</label>
                <input type="text" id="sv_brand_baterai" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-600 block mb-1">Qty (Bulan)</label>
                  <input type="number" id="sv_qty_baterai" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400">
                </div>
                <div>
                  <label class="text-xs text-slate-600 block mb-1">Est Omset (Rp)</label>
                  <input type="number" id="sv_omset_baterai" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400">
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-600 block mb-1">Order Dari Mana?</label>
                <input type="text" id="sv_order_baterai_dari" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400">
              </div>
            </div>

            <div class="bg-white p-4 rounded-xl border shadow-sm space-y-2">
              <label class="text-sm font-bold text-slate-700 block">Foto Toko <span class="text-red-500">*</span></label>
              <div class="text-xs text-slate-500 mb-2">Boleh file dari galeri atau langsung dari kamera.</div>
              <input type="file" id="sv_foto" accept="image/*" class="w-full text-sm mb-2" capture="environment">
              <div id="fotoPreviewContainer" class="hidden border border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex justify-center p-2 relative">
                 <img id="fotoPreview" src="" class="h-auto max-h-48 object-contain rounded">
                 <button type="button" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow" onclick="clearPhoto()">
                    <i class="fa-solid fa-trash"></i>
                 </button>
              </div>
            </div>
         </form>
       </div>

       <!-- Footer Action -->
       <div class="p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button id="submitSurveyBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg">
            <i class="fa-solid fa-cloud-arrow-up"></i> Simpan Hasil Survey
          </button>
       </div>
    </div>
  </div>

  <style>
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
    .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  </style>

  <script>
    const SUPABASE_URL = '${supabaseUrl}';
    const SUPABASE_KEY = '${supabaseKey}';
    
    let appData = ${JSON.stringify(initialData)};
    let activeSalesman = null;

    // Login Logic
    document.addEventListener('DOMContentLoaded', () => {
       const savedSalesman = localStorage.getItem('mapsAnalyzerSalesman');
       if (savedSalesman) {
          activeSalesman = JSON.parse(savedSalesman);
          document.getElementById('loginScreen').style.display = 'none';
       }
    });

    document.getElementById('loginBtn').addEventListener('click', async () => {
       const code = document.getElementById('salesmanCodeInput').value.trim();
       if (!code) {
          return Swal.fire('Error', 'Kode Salesman wajib diisi!', 'warning');
       }
       
       const btn = document.getElementById('loginBtn');
       btn.disabled = true;
       btn.innerHTML = '<span class="loader w-5 h-5 border-2 text-white mr-2"></span> Memeriksa...';

       try {
          const res = await fetch(SUPABASE_URL + '/rest/v1/salesman_customer?salesman_code=eq.' + encodeURIComponent(code) + '&select=salesman_code,salesman_name&limit=1', {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
          });
          const fetchedData = await res.json();
          if (res.ok && fetchedData && fetchedData.length > 0) {
             activeSalesman = { code: fetchedData[0].salesman_code, name: fetchedData[0].salesman_name };
             localStorage.setItem('mapsAnalyzerSalesman', JSON.stringify(activeSalesman));
             document.getElementById('loginScreen').style.opacity = '0';
             setTimeout(() => document.getElementById('loginScreen').style.display = 'none', 300);
          } else if (fetchedData && fetchedData.message) {
             Swal.fire('Error Database', 'Gagal memverifikasi: ' + fetchedData.message, 'error');
          } else {
             Swal.fire('Tidak Tersedia', 'Kode Salesman "' + code + '" tidak ditemukan.\\nPastikan sudah ditambahkan di menu Database Salesman', 'error');
          }
       } catch (err) {
          Swal.fire('Error', 'Gagal memverifikasi salesman', 'error');
       } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
       }
    });
    let dynamicTolerance = ${surveyTolerance};

    // Load Tolerance Setting globally when file is opened
    async function loadGlobalSettings() {
      try {
        const response = await fetch(SUPABASE_URL + '/rest/v1/app_settings?setting_key=eq.maps_survey_tolerance&select=setting_value', {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          }
        });
        const result = await response.json();
        if (result && result.length > 0 && result[0].setting_value) {
            dynamicTolerance = parseInt(result[0].setting_value.tolerance || ${surveyTolerance}, 10);
        }
      } catch (err) {
        console.log('Tolerance use fallback:', dynamicTolerance);
      }
    }
    loadGlobalSettings();
    
    // Load preferences from localStorage to persist is_rencana
    try {
       const savedRencana = localStorage.getItem('htmlApp_rencanaIds');
       const savedDate = localStorage.getItem('htmlApp_rencanaDate');
       const todayDate = new Date().toISOString().split('T')[0];

       if (savedRencana && savedDate === todayDate) {
           const parsedRencana = JSON.parse(savedRencana);
           appData.forEach(item => {
               if (parsedRencana[item.id] !== undefined) {
                   item.is_rencana = parsedRencana[item.id];
               }
           });
       } else {
           localStorage.removeItem('htmlApp_rencanaIds');
           localStorage.setItem('htmlApp_rencanaDate', todayDate);
       }
    } catch(e) {}

    function saveRencanaState() {
       try {
           const state = {};
           appData.forEach(item => { state[item.id] = item.is_rencana; });
           localStorage.setItem('htmlApp_rencanaIds', JSON.stringify(state));
           localStorage.setItem('htmlApp_rencanaDate', new Date().toISOString().split('T')[0]);
       } catch(e) {}
    }

    let currentLoc = null;
    let searchQuery = "";
    let activeTab = "semua";
    let activeDirectionFilter = null;
    let activeRouteFilter = null;
    let photoBase64 = null;
    let currentSurveyId = null;

    let currentPage = 1;
    const itemsPerPage = 50;
    
    document.getElementById('lastSyncTime').textContent = 'Sync: ' + new Date().toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'});

    // Haversine fallback to calculate crow distance
    function calcCrow(lat1, lon1, lat2, lon2) {
      if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    function distanceToSegmentKm(lat1, lon1, lat2, lon2, lat3, lon3) {
       lat1 = Number(lat1); lon1 = Number(lon1);
       lat2 = Number(lat2); lon2 = Number(lon2);
       lat3 = Number(lat3); lon3 = Number(lon3);
       
       const deg2rad = Math.PI / 180;
       const cosLat = Math.cos((lat1 + lat2) / 2 * deg2rad);
       const x1 = lon1 * cosLat * 111.320; 
       const y1 = lat1 * 111.320;
       const x2 = lon2 * cosLat * 111.320;
       const y2 = lat2 * 111.320;
       const x3 = lon3 * cosLat * 111.320;
       const y3 = lat3 * 111.320;
       
       const px = x2 - x1;
       const py = y2 - y1;
       const d2 = px*px + py*py;
       
       if (d2 === 0) {
           const dx = x3 - x1;
           const dy = y3 - y1;
           return { distance: Math.sqrt(dx*dx + dy*dy), isBehind: false };
       }
       
       let t = ((x3 - x1) * px + (y3 - y1) * py) / d2;
       let tClamped = Math.max(0, Math.min(1, t));
       
       let distance = Math.sqrt(Math.pow(x3 - (x1 + tClamped * px), 2) + Math.pow(y3 - (y1 + tClamped * py), 2));
       
       // t < 0 means it's mathematically "behind" the start point along the vector
       return { distance: distance, isBehind: t < 0 };
    }

    function getCompassDirection(lat1, lon1, lat2, lon2) {
        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;
        if (Math.abs(dLat) > Math.abs(dLon)) {
            return dLat > 0 ? 'Utara' : 'Selatan';
        } else {
            return dLon > 0 ? 'Timur' : 'Barat';
        }
    }

    function updateDistances() {
       if (!currentLoc) return;
       let counts = { Utara: 0, Timur: 0, Selatan: 0, Barat: 0 };
       appData.forEach(item => {
          if (item.lat && item.lng) {
             item.distance = calcCrow(currentLoc.lat, currentLoc.lng, item.lat, item.lng);
             item.compassDirection = getCompassDirection(currentLoc.lat, currentLoc.lng, item.lat, item.lng);
             if (counts[item.compassDirection] !== undefined) counts[item.compassDirection]++;
          } else {
             item.distance = 999999;
             item.compassDirection = null;
          }
       });
       
       document.getElementById('dirCountUtara').textContent = counts.Utara;
       document.getElementById('dirCountTimur').textContent = counts.Timur;
       document.getElementById('dirCountSelatan').textContent = counts.Selatan;
       document.getElementById('dirCountBarat').textContent = counts.Barat;
       document.getElementById('compassContainer').classList.remove('hidden');
       
       appData.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
    }

    window.filterDirection = function(dir) {
       activeDirectionFilter = dir;
       document.getElementById('activeDirName').textContent = dir;
       document.getElementById('activeDirectionFilterBlock').classList.remove('hidden');
       document.getElementById('activeDirectionFilterBlock').classList.add('flex');
       currentPage = 1;
       renderList();
    };

    window.clearDirectionFilter = function() {
       activeDirectionFilter = null;
       document.getElementById('activeDirectionFilterBlock').classList.add('hidden');
       document.getElementById('activeDirectionFilterBlock').classList.remove('flex');
       currentPage = 1;
       renderList();
    };

    window.filterRoute = function(id) {
       const item = appData.find(d => String(d.id) === String(id));
       if (!item || !item.lat || !item.lng) {
          Swal.fire('Oops', 'Koordinat tujuan tidak tersedia', 'warning');
          return;
       }
       if (!currentLoc) {
          Swal.fire('Lokasi Belum Tersedia', 'Klik refresh lokasi terlebih dahulu', 'warning');
          return;
       }
       activeRouteFilter = item;
       document.getElementById('activeRouteName').textContent = item.nama_customer;
       document.getElementById('activeRouteFilterBlock').classList.remove('hidden');
       document.getElementById('activeRouteFilterBlock').classList.add('flex');
       
       // clearing other filters
       activeDirectionFilter = null;
       document.getElementById('activeDirectionFilterBlock').classList.add('hidden');
       document.getElementById('activeDirectionFilterBlock').classList.remove('flex');
       
       searchQuery = "";
       const searchInputEl = document.getElementById('searchInput');
       if (searchInputEl) searchInputEl.value = "";
       
       // Move to 'semua' tab to see all en-route stores
       activeTab = "semua";
       document.querySelectorAll('.tab-btn').forEach(b => {
           b.classList.remove('active', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-200');
           b.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
           if (b.getAttribute('data-tab') === 'semua') {
               b.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
               b.classList.add('active', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-200');
           }
       });
       
       currentPage = 1;
       renderList();
       window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.clearRouteFilter = function() {
       activeRouteFilter = null;
       document.getElementById('activeRouteFilterBlock').classList.add('hidden');
       document.getElementById('activeRouteFilterBlock').classList.remove('flex');
       currentPage = 1;
       renderList();
    };

    let compassStarted = false;
    window.requestCompass = function() {
        if (compassStarted) return;
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                         compassStarted = true;
                         window.addEventListener('deviceorientation', handleOrientation);
                    } else {
                         Swal.fire('Izin Ditolak', 'Tidak dapat mengakses sensor kompas karena izin ditolak browser/perangkat.', 'warning');
                    }
                })
                .catch(err => {
                    console.error(err);
                    Swal.fire('Error Sensor', 'Terjadi kesalahan saat meminta izin kompas.', 'error');
                });
        } else {
            compassStarted = true;
            window.addEventListener('deviceorientationabsolute', handleOrientation);
            window.addEventListener('deviceorientation', handleOrientation);
            Swal.fire({ title: 'Sensor Aktif', text: 'Mendeteksi arah utara...', icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
        }
    };

    function handleOrientation(event) {
        let compassHeading = null;
        if (event.webkitCompassHeading !== undefined) {
            compassHeading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            // Absolute rotation fallback
            if (event.absolute || event.webkitCompassHeading === undefined) {
                 compassHeading = 360 - event.alpha; 
            }
        }
        
        if (compassHeading !== null) {
            const arrow = document.getElementById('northArrow');
            if (arrow) {
                arrow.style.transform = 'rotate(' + (-compassHeading) + 'deg)';
            }
        }
    }

    window.changePage = function(delta) {
       currentPage += delta;
       renderList();
       window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function renderList() {
       const container = document.getElementById('listContainer');
       const filterText = searchQuery.toLowerCase();
       
       let filteredResults = appData.filter(item => {
          if (activeTab === 'rencana' && !item.is_rencana) return false;
          if (activeTab === 'belum' && item.is_surveyed) return false;
          if (activeTab === 'sudah' && (!item.is_surveyed)) return false;
          
          if (activeDirectionFilter && item.compassDirection !== activeDirectionFilter) return false;
          
          if (activeRouteFilter) {
             if (!item.lat || !item.lng) return false;
             // Distance to the route segment
             const segmentCheck = distanceToSegmentKm(currentLoc.lat, currentLoc.lng, activeRouteFilter.lat, activeRouteFilter.lng, item.lat, item.lng);
             // We also want to make sure it is not too far away from currentLoc (it shouldn't be much further than the destination)
             const destCrowDist = activeRouteFilter.distance || 0;
             const itemCrowDist = item.distance || 0;
             
             // Discard if it's behind the user
             if (segmentCheck.isBehind) return false;
             
             // Include if within 3km of the route line AND not exceedingly further than the destination
             if (segmentCheck.distance > 3) return false; // widened to 3km
             if (itemCrowDist > destCrowDist + 5) return false; // allow slightly passing destination
          }

          const matchesSearch = item.nama_customer.toLowerCase().includes(filterText) ||
                                item.kecamatan_kota.toLowerCase().includes(filterText);
          return matchesSearch;
       });

       const totalItems = filteredResults.length;
       const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
       
       if (activeDirectionFilter) {
           const activeDirCountEl = document.getElementById('activeDirCount');
           if (activeDirCountEl) activeDirCountEl.textContent = totalItems;
       }
       if (activeRouteFilter) {
           const activeRouteCountEl = document.getElementById('activeRouteCount');
           // subtract 1 because the destination itself is in the list
           if (activeRouteCountEl) activeRouteCountEl.textContent = Math.max(0, totalItems - 1);
       }

       if (currentPage > totalPages) currentPage = totalPages;
       if (currentPage < 1) currentPage = 1;
       
       const startIdx = (currentPage - 1) * itemsPerPage;
       const endIdx = startIdx + itemsPerPage;
       const paginatedResults = filteredResults.slice(startIdx, endIdx);

       let html = '';
       let visibleCount = totalItems;
       
       paginatedResults.forEach(item => {
          const statusText = item.is_surveyed ? '<i class="fa-solid fa-check"></i> Sudah' : '<i class="fa-regular fa-clock"></i> Belum';
          const statusClass = item.is_surveyed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200';
          const showEdit = activeTab === 'sudah' && item.is_surveyed;
          const surveyBtnClass = showEdit ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30';
          const surveyBtnIcon = showEdit ? '<i class="fa-solid fa-pen-to-square"></i> Edit' : '<i class="fa-solid fa-clipboard-check"></i> Survey';
          const isEditMode = showEdit;
          
          let mapUrl = item.final_url || (item.lat ? \`https://www.google.com/maps/search/?api=1&query=\${item.lat},\${item.lng}\` : '#');
          
          let distStr = 'Membutuhkan Lokasi';
          if (item.distance && item.distance !== 999999) {
             let distFixed = item.distance.toFixed(2);
             let minutes = Math.ceil((item.distance / 30) * 60);
             distStr = \`<span class="font-bold text-indigo-700">\${distFixed} km</span> <span class="text-slate-400 mx-1">•</span> \${minutes} menit\`;
          }

          let surveyHistoryHtml = '';
          if (activeTab === 'sudah' && item.is_surveyed) {
              const ls = item.latest_survey;
              const surveyorLabel = ls && ls.nama_salesman ? '<div class="mt-2 text-xs bg-slate-100 text-slate-600 py-1.5 px-2 rounded-lg border border-slate-200"><i class="fa-solid fa-user-check text-emerald-500 mr-1"></i> Disurvey oleh: <b>' + ls.nama_salesman + '</b></div>' : '';
              if (ls) {
                 surveyHistoryHtml = \`
                   <div class="mt-4 border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <div class="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 border-b border-slate-200 flex justify-between">
                         <span><i class="fa-solid fa-clock-rotate-left mr-1"></i> Tgl: \${item.last_visit_date || '-'}</span>
                         <span>\${item.survey_count || 0}x Kunjungan</span>
                      </div>
                      <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                          <thead class="bg-indigo-50/50 text-[10px] uppercase text-indigo-800/80">
                            <tr>
                              <th class="px-3 py-1.5 font-bold border-b border-r border-indigo-100">Kategori</th>
                              <th class="px-3 py-1.5 font-bold border-b border-r border-indigo-100">Brand</th>
                              <th class="px-3 py-1.5 font-bold border-b border-r border-indigo-100">Qty</th>
                              <th class="px-3 py-1.5 font-bold border-b border-indigo-100 whitespace-nowrap">Omset</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr class="border-b border-slate-100">
                              <td class="px-3 py-2 font-medium text-slate-700 border-r border-slate-100"><i class="fa-solid fa-mobile-screen opacity-50 mr-1"></i> LCD</td>
                              <td class="px-3 py-2 text-slate-600 border-r border-slate-100 font-bold">\${ls.brand_lcd || '-'}</td>
                              <td class="px-3 py-2 text-slate-600 border-r border-slate-100">\${ls.qty_lcd || '0'}</td>
                              <td class="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap">\${parseInt(ls.omset_lcd || '0').toLocaleString('id-ID')}</td>
                            </tr>
                            <tr>
                              <td class="px-3 py-2 font-medium text-slate-700 border-r border-slate-100"><i class="fa-solid fa-battery-full opacity-50 mr-1"></i> Baterai</td>
                              <td class="px-3 py-2 text-slate-600 border-r border-slate-100 font-bold">\${ls.brand_baterai || '-'}</td>
                              <td class="px-3 py-2 text-slate-600 border-r border-slate-100">\${ls.qty_baterai || '0'}</td>
                              <td class="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap">\${parseInt(ls.omset_baterai || '0').toLocaleString('id-ID')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                   </div>
                 \`;
              }
          }

          html += \`
            <div class="bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100 p-4 mb-3 relative overflow-hidden">
               <!-- Ribbon for is_rencana -->
               \${item.is_rencana ? '<div class="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-blue-600 z-10"><i class="fa-solid fa-calendar-day mr-1"></i>HARI INI</div>' : ''}
              
              <div class="pr-20 mb-3">
                 <h3 class="font-bold text-slate-800 text-[17px] leading-tight mb-1">\${item.nama_customer}</h3>
                 <p class="text-xs text-slate-500 truncate flex items-center gap-1.5"><i class="fa-solid fa-location-dot w-3 text-center"></i> \${item.kecamatan_kota}</p>
              </div>
              
              <div class="text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 break-words leading-relaxed">
                 \${item.alamat_lengkap}
              </div>
              
              <div class="flex flex-col gap-3">
                 <div class="flex gap-2 text-xs w-full justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div class="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-md border border-indigo-100 w-max font-medium">
                      <i class="fa-solid fa-route text-indigo-400"></i> \${distStr}
                    </div>
                    <span class="px-2 py-1 text-[11px] rounded-full border font-bold \${statusClass}">\${statusText}</span>
                 </div>
                 
                 \${surveyHistoryHtml}

                 <div class="flex gap-2">
                   <a href="\${mapUrl}" target="_blank" class="flex-none w-[45px] sm:w-[50px] bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 py-2.5 rounded-xl text-sm transition-colors flex flex-col items-center justify-center gap-1" title="Maps">
                      <i class="fa-solid fa-map"></i>
                   </a>
                   <button onclick="filterRoute('\${item.id}')" class="flex-none w-[45px] sm:w-[50px] bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 py-2.5 rounded-xl text-sm transition-colors flex flex-col items-center justify-center gap-1" title="Cari Searah">
                      <i class="fa-solid fa-route"></i>
                   </button>
                   <button onclick="toggleRencana('\${item.id}')" class="flex-none w-[45px] sm:w-[50px] bg-white text-blue-500 border border-slate-200 hover:bg-blue-50 py-2.5 rounded-xl text-sm transition-colors flex flex-col items-center justify-center gap-1" title="Jadikan Rencana">
                      <i class="fa-solid \${item.is_rencana ? 'fa-calendar-minus' : 'fa-calendar-plus'}"></i>
                   </button>
                   <button onclick="openSurvey('\${item.id}')" class="flex-1 text-white shadow-md py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 \${surveyBtnClass}">
                      \${surveyBtnIcon}
                   </button>
                 </div>
              </div>
            </div>
          \`;
       });
       
       if (totalItems === 0) {
          if (activeTab === 'sudah') {
            html = \`<div class="text-center p-8 bg-blue-50 rounded-2xl border border-dashed border-blue-200 mt-4">
               <div class="text-blue-300 text-4xl mb-3"><i class="fa-solid fa-rotate"></i></div>
               <p class="text-blue-600 font-bold mb-1">Riwayat Kosong</p>
               <p class="text-slate-500 font-medium text-sm">Silahkan klik tombol <b><i class="fa-solid fa-cloud-arrow-down"></i> Sync DB</b> agar data riwayat dari database termuat ke perangkat.</p>
            </div>\`;
          } else {
            html = \`<div class="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4">
               <div class="text-slate-300 text-5xl mb-3"><i class="fa-solid fa-folder-open"></i></div>
               <p class="text-slate-500 font-medium">Tidak ada data kunjungan ditemukan.</p>
            </div>\`;
          }
       } else {
          // Pagination controls
          html += \`
            <div class="flex items-center justify-between mt-4 mb-6 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <button onclick="changePage(-1)" \${currentPage === 1 ? 'disabled class="px-3 py-2 text-slate-400 bg-slate-50 rounded-xl text-xs sm:text-sm font-bold opacity-50 cursor-not-allowed"' : 'class="px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs sm:text-sm font-bold transition-colors"'}>
                <i class="fa-solid fa-chevron-left"></i> Prev
              </button>
              <div class="text-xs sm:text-sm font-bold text-slate-500 whitespace-nowrap">
                Hal \${currentPage} / \${totalPages}
              </div>
              <button onclick="changePage(1)" \${currentPage === totalPages ? 'disabled class="px-3 py-2 text-slate-400 bg-slate-50 rounded-xl text-xs sm:text-sm font-bold opacity-50 cursor-not-allowed"' : 'class="px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs sm:text-sm font-bold transition-colors"'}>
                Next <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          \`;
       }
       
       let topHtml = '';
       if (activeTab === 'rencana' && visibleCount > 0 && searchQuery.trim() === '') {
           topHtml = \`
             <div class="flex gap-2 mb-3 w-full max-w-full">
               <button onclick="bukaRuteMapsPreview()" class="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                 <i class="fa-solid fa-map"></i>
                 Rute di Maps (\${visibleCount})
               </button>
               <button onclick="hapusSemuaRencanaPreview()" class="flex-1 bg-orange-100 text-orange-700 hover:bg-orange-200 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                 <i class="fa-solid fa-xmark"></i>
                 Hapus Rencana (\${visibleCount})
               </button>
             </div>
           \`;
       }
       
       container.innerHTML = topHtml + html;
       
       const searchCountEl = document.getElementById('searchCount');
       const searchCountContainer = document.getElementById('searchCountContainer');
       if (searchQuery.trim() !== '') {
          searchCountEl.textContent = visibleCount;
          searchCountContainer.classList.remove('hidden');
       } else {
          searchCountContainer.classList.add('hidden');
       }
    }

    // Tab interactions
    document.querySelectorAll('.tab-btn').forEach(btn => {
       btn.addEventListener('click', (e) => {
          document.querySelectorAll('.tab-btn').forEach(b => {
             b.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-200');
             b.classList.add('bg-white', 'text-slate-600', 'border-slate-200', 'hover:bg-slate-50');
          });
          const curr = e.currentTarget;
          curr.classList.remove('bg-white', 'text-slate-600', 'border-slate-200', 'hover:bg-slate-50');
          curr.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-200');
          
          activeTab = curr.dataset.tab;
          renderList();
       });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
       searchQuery = e.target.value;
       renderList();
    });

    document.getElementById('refreshLocBtn').addEventListener('click', () => {
       if (!navigator.geolocation) return Swal.fire('Error', 'Browser tidak mendukung GPS', 'error');
       
       const btn = document.getElementById('refreshLocBtn');
       const loader = document.getElementById('locLoader');
       btn.disabled = true; loader.classList.remove('hidden');
       
       navigator.geolocation.getCurrentPosition(
          (pos) => {
             currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
             updateDistances();
             renderList();
             
             // Reverse geocode to keep track for survey
             fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${currentLoc.lat}&lon=\${currentLoc.lng}\`)
             .then(r => r.json()).then(data => {
                currentLoc.addressName = data.display_name;
             }).catch(console.error);
             
             Swal.fire({ title: 'Lokasi Diperbarui', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
             btn.disabled = false; loader.classList.add('hidden');
          },
          (err) => {
             Swal.fire('Error GPS', 'Pastikan GPS aktif & diberikan izin. ' + err.message, 'error');
             btn.disabled = false; loader.classList.add('hidden');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
       );
    });

    document.getElementById('syncDbBtn').addEventListener('click', async () => {
       if (!SUPABASE_URL || !SUPABASE_KEY) return Swal.fire('Error', 'Konfigurasi DB kosong', 'error');
       
       const btn = document.getElementById('syncDbBtn');
       const loader = document.getElementById('syncLoader');
       btn.disabled = true; loader.classList.remove('hidden');
       
       try {
          const survReq = await fetch(SUPABASE_URL + '/rest/v1/survey_lcd?select=nama_toko,created_at,brand_lcd,qty_lcd,omset_lcd,brand_baterai,qty_baterai,omset_baterai,salesman_code,nama_salesman', {
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': \`Bearer \${SUPABASE_KEY}\` }
          });
          const survData = await survReq.json();
          const surveyedSet = new Set(survData.map(s => s.nama_toko ? s.nama_toko.trim().toLowerCase() : ''));
          
          let allMapsData = [];
          let page = 0; let hasMore = true;
          
          while(hasMore) {
             const mapsReq = await fetch(\`\${SUPABASE_URL}/rest/v1/maps_analyzer?select=*\`, {
                headers: { 
                  'apikey': SUPABASE_KEY, 'Authorization': \`Bearer \${SUPABASE_KEY}\`,
                  'Range': \`\${page*1000}-\${(page*1000)+999}\`, 'Prefer': 'count=exact'
                }
             });
             const chunk = await mapsReq.json();
             allMapsData = allMapsData.concat(chunk);
             if (!Array.isArray(chunk) || chunk.length < 1000) hasMore = false; else page++;
          }
          
          // refresh data globally locally
          appData = allMapsData.map(d => {
             const storeNameLower = (d.nama_customer || '').trim().toLowerCase();
             const _is_surveyed = surveyedSet.has(storeNameLower);
             const existingItem = appData.find(old => old.id === d.id);
             
             const storeSurveys = survData.filter(s => s.nama_toko && s.nama_toko.trim().toLowerCase() === storeNameLower);
             storeSurveys.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
             
             const latestSurvey = storeSurveys[0] || null;
             let lastVisitDate = '-';
             if (latestSurvey && latestSurvey.created_at) {
                lastVisitDate = new Date(latestSurvey.created_at).toLocaleDateString('id-ID', {day: '2-digit', month:'short', year:'numeric'});
             }

             return {
                id: d.id,
                nama_customer: d.nama_customer || '-',
                kecamatan_kota: d.kecamatan_kota || '-',
                alamat_lengkap: d.alamat_lengkap || '-',
                lat: d.lat, lng: d.lng,
                final_url: d.final_url || '',
                is_surveyed: _is_surveyed,
                is_rencana: existingItem ? existingItem.is_rencana : false,
                survey_count: storeSurveys.length,
                last_visit_date: lastVisitDate,
                latest_survey: latestSurvey ? {
                   brand_lcd: latestSurvey.brand_lcd || '-',
                   qty_lcd: latestSurvey.qty_lcd || '0',
                   omset_lcd: latestSurvey.omset_lcd || '0',
                   brand_baterai: latestSurvey.brand_baterai || '-',
                   qty_baterai: latestSurvey.qty_baterai || '0',
                   omset_baterai: latestSurvey.omset_baterai || '0',
                } : null
             };
          });
          
          document.getElementById('lastSyncTime').textContent = 'Sync: ' + new Date().toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit'});
          updateDistances();
          renderList();
          Swal.fire({ title: 'Tersinkronisasi', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
       } catch(err) {
          Swal.fire('Error', 'Gagal memuat dari Database: ' + err.message, 'error');
       } finally {
          btn.disabled = false; loader.classList.add('hidden');
       }
    });

    // --- Modal Logic ---

    window.bukaRuteMapsPreview = function() {
        const plannedItems = appData.filter(d => d.is_rencana && d.lat && d.lng);
        if (plannedItems.length === 0) {
            Swal.fire('Oops!', 'Tidak ada toko dalam rencana yang memiliki koordinat.', 'warning');
            return;
        }
        
        const destination = plannedItems[plannedItems.length - 1];
        const waypoints = plannedItems.slice(0, plannedItems.length - 1);
        
        let url = 'https://www.google.com/maps/dir/?api=1&destination=' + destination.lat + ',' + destination.lng;
        
        if (waypoints.length > 0) {
            url += '&waypoints=';
            const points = waypoints.map(w => w.lat + ',' + w.lng);
            url += points.join('|');
        }
        window.open(url, '_blank');
    };

    window.hapusSemuaRencanaPreview = function() {
        Swal.fire({
          title: 'Hapus Semua Rencana?',
          text: 'Semua toko di tab ini akan dihapus dari Rencana Hari Ini.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Batal',
          confirmButtonColor: '#ea580c'
        }).then(r => {
          if (r.isConfirmed) {
              appData.forEach(d => {
                 if (d.is_rencana) d.is_rencana = false;
              });
              saveRencanaState();
              renderList();
              Swal.fire({ title: 'Terhapus', text: 'Semua toko dihapus dari Rencana', icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
          }
        });
    };

    window.toggleRencana = function(id) {
       const item = appData.find(d => d.id === id);
       if (!item) return;
       item.is_rencana = !item.is_rencana;
       saveRencanaState();
       
       if (item.is_rencana) {
          Swal.fire({ title: 'Ditambahkan ke Rencana', text: item.nama_customer, icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
       } else {
          Swal.fire({ title: 'Dihapus dari Rencana', text: item.nama_customer, icon: 'info', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
       }
       renderList();
    };

    // Validasi radius (km) - 75 meter
    window.openSurvey = async function(id, isEdit = false) {
       const item = appData.find(d => d.id === id);
       if (!item) return;
       currentSurveyId = null;
       
       if (!currentLoc) {
           Swal.fire({
               title: 'Lokasi Belum Tersedia',
               text: 'Anda harus klik "Refresh Lokasi" sebelum bisa absensi/survey toko.',
               icon: 'warning',
               confirmButtonText: 'Refresh Lokasi',
               confirmButtonColor: '#2563eb'
           }).then((r) => { if (r.isConfirmed) document.getElementById('refreshLocBtn').click(); });
           return;
       }
       
       if (item.lat && item.lng) {
          if (!item.distance || item.distance > (dynamicTolerance / 1000)) {
             Swal.fire({
                title: 'Di Luar Jangkauan',
                html: \`Anda harus berada di titik toko untuk melakukan survey.<br><br>Jarak Anda: <b>\${(item.distance*1000).toFixed(0)} meter</b><br>Maksimal: <b>\${dynamicTolerance} meter</b>\`,
                icon: 'error',
                confirmButtonColor: '#e3342f'
             });
             return;
          }
       } else {
          Swal.fire({
             title: 'Customer Tanpa Koordinat',
             text: 'Customer ini tidak ada lokasi kordinatnya, absensi akan menggunakan lokasi anda saat ini',
             icon: 'info',
             toast: true, position: 'top', timer: 3000, showConfirmButton: false
          });
       }

       // Populate form base data
       document.getElementById('sv_id').value = item.id;
       document.getElementById('sv_nama_toko').value = item.nama_customer;
       document.getElementById('sv_alamat').value = currentLoc.addressName || item.alamat_lengkap;
       document.getElementById('sv_lat').value = currentLoc.lat;
       document.getElementById('sv_lng').value = currentLoc.lng;
       
       // clear inputs
       ['sv_no_telp','sv_brand_lcd','sv_qty_lcd','sv_omset_lcd','sv_order_lcd_dari',
        'sv_brand_baterai','sv_qty_baterai','sv_omset_baterai','sv_order_baterai_dari'].forEach(fid => {
          document.getElementById(fid).value = '';
       });
       
       window.clearPhoto();

       if (isEdit && item.is_surveyed) {
          try {
             Swal.fire({ title: 'Memuat Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
             const req = await fetch(\`\${SUPABASE_URL}/rest/v1/survey_lcd?nama_toko=eq.\${encodeURIComponent(item.nama_customer)}&select=*\`, {
                 headers: { 'apikey': SUPABASE_KEY, 'Authorization': \`Bearer \${SUPABASE_KEY}\` }
             });
             const res = await req.json();
             Swal.close();
             if (res && res.length > 0) {
                 const d = res[res.length - 1]; // get latest
                 currentSurveyId = d.id;
                 if (d.alamat_asli) document.getElementById('sv_alamat').value = d.alamat_asli;
                 if (d.no_telp) document.getElementById('sv_no_telp').value = d.no_telp;
                 if (d.brand_lcd) document.getElementById('sv_brand_lcd').value = d.brand_lcd;
                 if (d.qty_lcd) document.getElementById('sv_qty_lcd').value = d.qty_lcd;
                 if (d.omset_lcd) document.getElementById('sv_omset_lcd').value = d.omset_lcd;
                 if (d.order_lcd_dari) document.getElementById('sv_order_lcd_dari').value = d.order_lcd_dari;
                 if (d.brand_baterai) document.getElementById('sv_brand_baterai').value = d.brand_baterai;
                 if (d.qty_baterai) document.getElementById('sv_qty_baterai').value = d.qty_baterai;
                 if (d.omset_baterai) document.getElementById('sv_omset_baterai').value = d.omset_baterai;
                 if (d.order_baterai_dari) document.getElementById('sv_order_baterai_dari').value = d.order_baterai_dari;
                 if (d.foto_toko) {
                     photoBase64 = d.foto_toko;
                     document.getElementById('fotoPreview').src = photoBase64;
                     document.getElementById('fotoPreviewContainer').classList.remove('hidden');
                 }
             }
          } catch(err) {
             console.error('Fetch error:', err);
             Swal.close();
             Swal.fire('Error', 'Gagal memuat data survey sebelumnya', 'warning');
          }
       }
       
       document.getElementById('surveyModal').classList.remove('hidden');
       document.body.style.overflow = 'hidden';
    };

    document.getElementById('closeModalBtn').addEventListener('click', () => {
       document.getElementById('surveyModal').classList.add('hidden');
       document.body.style.overflow = '';
       currentSurveyId = null;
    });

    // Photo preview
    document.getElementById('sv_foto').addEventListener('change', (e) => {
       const file = e.target.files[0];
       if (!file) { window.clearPhoto(); return; }
       
       const reader = new FileReader();
       reader.readAsDataURL(file);
       reader.onload = (evt) => {
          const img = new Image();
          img.src = evt.target.result;
          img.onload = () => {
             const canvas = document.createElement('canvas');
             let width = img.width;
             let height = img.height;
             
             const MAX_DIM = 800;
             if (width > height) {
                if (width > MAX_DIM) {
                   height *= MAX_DIM / width;
                   width = MAX_DIM;
                }
             } else {
                if (height > MAX_DIM) {
                   width *= MAX_DIM / height;
                   height = MAX_DIM;
                }
             }
             
             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx.drawImage(img, 0, 0, width, height);
             
             let quality = 0.8;
             let dataUrl = canvas.toDataURL('image/jpeg', quality);
             
             while (Math.round((dataUrl.length * 3) / 4) / 1024 > 100 && quality > 0.1) {
                quality -= 0.1;
                dataUrl = canvas.toDataURL('image/jpeg', quality);
             }
             
             photoBase64 = dataUrl;
             document.getElementById('fotoPreview').src = photoBase64;
             document.getElementById('fotoPreviewContainer').classList.remove('hidden');
          };
       };
    });

    window.clearPhoto = function() {
       document.getElementById('sv_foto').value = '';
       document.getElementById('fotoPreview').src = '';
       document.getElementById('fotoPreviewContainer').classList.add('hidden');
       photoBase64 = null;
    }

    // Submit Survey Native
    document.getElementById('submitSurveyBtn').addEventListener('click', async () => {
       const nama_toko = document.getElementById('sv_nama_toko').value;
       const btn = document.getElementById('submitSurveyBtn');
       
       if (!photoBase64) {
          return Swal.fire('Peringatan', 'Foto Wajib dilampirkan!', 'warning');
       }
       
       btn.disabled = true;
       const originalContent = btn.innerHTML;
       btn.innerHTML = '<span class="loader w-5 h-5 border-2 text-white mr-2"></span> Menyimpan...';

       const payload = {
           salesman_code: activeSalesman?.code || '',
           nama_salesman: activeSalesman?.name || '',
           nama_toko: nama_toko,
           alamat_asli: document.getElementById('sv_alamat').value,
           no_telp: document.getElementById('sv_no_telp').value,
           brand_lcd: document.getElementById('sv_brand_lcd').value,
           qty_lcd: document.getElementById('sv_qty_lcd').value,
           omset_lcd: document.getElementById('sv_omset_lcd').value,
           order_lcd_dari: document.getElementById('sv_order_lcd_dari').value,
           brand_baterai: document.getElementById('sv_brand_baterai').value,
           qty_baterai: document.getElementById('sv_qty_baterai').value,
           omset_baterai: document.getElementById('sv_omset_baterai').value,
           order_baterai_dari: document.getElementById('sv_order_baterai_dari').value,
           latitude: document.getElementById('sv_lat').value,
           longitude: document.getElementById('sv_lng').value,
           foto_toko: photoBase64
       };

       try {
           const endpoint = currentSurveyId ? \`\${SUPABASE_URL}/rest/v1/survey_lcd?id=eq.\${currentSurveyId}\` : \`\${SUPABASE_URL}/rest/v1/survey_lcd\`;
           const method = currentSurveyId ? 'PATCH' : 'POST';

           const res = await fetch(endpoint, {
               method: method,
               headers: {
                   'Content-Type': 'application/json',
                   'apikey': SUPABASE_KEY,
                   'Authorization': \`Bearer \${SUPABASE_KEY}\`,
                   'Prefer': 'return=minimal'
               },
               body: JSON.stringify(payload)
           });
           
           if (!res.ok) {
              const errTxt = await res.text();
              throw new Error(errTxt || 'Gagal menyimpan database');
           }
           
           // Update memory set
           const id = document.getElementById('sv_id').value;
           const it = appData.find(d => d.id === id);
           if (it) it.is_surveyed = true;
           
           Swal.fire('Berhasil Terkirim', 'Data survey Disimpan di Server Supabase.', 'success');
           document.getElementById('closeModalBtn').click();
           renderList();
           
       } catch (err) {
           Swal.fire('Gagal Menyimpan', err.message, 'error');
       } finally {
           btn.disabled = false;
           btn.innerHTML = originalContent;
       }
    });

    // Init display
    renderList();
  </script>
</body>
</html>`;

    return htmlContent;
  };

  const executeDownloadHtml = async () => {
     const html = buildHtml();
     if (!html) return;
     const blob = new Blob([html], { type: 'text/html' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = activeListTab === 'rencana' ? 'Daftar_Rencana_Kunjungan.html' : 'Daftar_Semua_Kunjungan.html';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
  };
  
  const executePreviewHtml = async () => {
     const html = buildHtml();
     if (html) setPreviewHtml(html);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredData.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="mb-20 w-full space-y-6">
      
      {/* API Status Toast */}
      {config && (
         <div className="flex justify-between items-center p-2 mb-2">
           <div className="flex-1">
             {config.googleMapsKeyExists && (
               <button 
                  onClick={() => setShowPricingModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors rounded-full text-xs font-bold shadow-sm"
               >
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  Info API & Biaya
               </button>
             )}
             <PricingInfoModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
           </div>
           
           <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold border shadow-sm ${config.googleMapsKeyExists ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              <div className={`w-2 h-2 rounded-full ${config.googleMapsKeyExists ? 'bg-teal-500' : 'bg-rose-500'} animate-pulse`} />
              {config.googleMapsKeyExists ? 'Google Maps API Terhubung' : 'Google Maps API Belum Terhubung (Menggunakan OSRM)'}
           </div>
         </div>
      )}

      <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50 relative overflow-visible">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
                 <Search className="w-5 h-5" />
               </div>
               <div>
                 <CardTitle className="text-xl font-black text-slate-800">Tambah Lokasi Kunjungan</CardTitle>
                 <p className="text-xs font-semibold text-slate-500 mt-0.5">Cari langsung atau ekstrak dari link Google Maps</p>
               </div>
             </div>
             
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveAddTab('search')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeAddTab === 'search' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Cari Tempat
                </button>
                <button 
                  onClick={() => setActiveAddTab('bulk')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeAddTab === 'bulk' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pencarian Masal
                </button>
                <button 
                  onClick={() => setActiveAddTab('link')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeAddTab === 'link' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Ekstrak Link
                </button>
             </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {activeAddTab === 'search' ? (
             <div className="relative z-10" ref={searchContainerRef}>
               <label className="text-xs font-bold text-slate-500 uppercase">Cari Nama Tempat / Alamat</label>
               <div className="relative mt-1">
                 <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowPredictions(true)}
                    className="w-full border border-slate-200 rounded-lg p-3 pt-3 pb-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none pl-10 pr-10"
                    placeholder="Ketik lokasi yang ingin dikunjungi..."
                 />
                 <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                 {searchQuery && !isSearchingPlaces && (
                   <button 
                     type="button"
                     onClick={() => {
                        setSearchQuery('');
                        setPredictions([]);
                        setShowPredictions(false);
                     }}
                     className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors"
                   >
                     <X className="w-3.5 h-3.5" />
                   </button>
                 )}
                 {isSearchingPlaces && (
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                 )}
               </div>
               
               {showPredictions && predictions.length > 0 && (
                 <div 
                   className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-100 divide-y divide-slate-100 max-h-[400px] overflow-y-auto"
                   onScroll={(e) => {
                     const target = e.target as HTMLDivElement;
                     if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                        handleLoadMorePlaces();
                     }
                   }}
                 >
                    {predictions.map((p: any, idx: number) => {
                       const key = `${p.id}-${idx}`;
                       const isSaved = savedData.some(d => 
                          (d.alamat_lengkap && d.alamat_lengkap.toLowerCase().includes((p.formattedAddress || '').toLowerCase())) || 
                          (d.nama_customer && d.nama_customer.toLowerCase() === p.displayName?.text?.toLowerCase())
                       );
                       
                       return (
                         <div 
                           key={key} 
                           onClick={() => handleSelectPlace(p)}
                           className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                         >
                           <div className="mt-0.5 flex-shrink-0 self-start">
                              <MapPin className="w-4 h-4 text-slate-400" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-800 flex items-center justify-between gap-2 overflow-hidden">
                                 <span className="truncate">{p.displayName?.text}</span>
                                 {isSaved && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 shadow-sm border border-green-200">Disimpan</span>}
                              </div>
                              
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-xs text-slate-500">
                                {p.rating && (
                                  <span className="flex items-center gap-0.5 font-medium text-slate-700">
                                    {p.rating}
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 relative -top-[0.5px]" />
                                    {p.userRatingCount ? <span className="text-slate-500 font-normal">({p.userRatingCount})</span> : ''}
                                  </span>
                                )}
                                {(p.rating || p.userRatingCount) && p.primaryTypeDisplayName?.text && <span>&bull;</span>}
                                {p.primaryTypeDisplayName?.text && (
                                  <span className="text-slate-600 truncate">{p.primaryTypeDisplayName.text}</span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-xs text-slate-500">
                                {p.regularOpeningHours?.openNow !== undefined && (
                                  <span className={p.regularOpeningHours.openNow ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                    {p.regularOpeningHours.openNow ? 'Buka' : 'Tutup'}
                                  </span>
                                )}
                                
                                {myLoc?.lat && myLoc?.lng && p.location?.latitude && p.location?.longitude && (
                                  <>
                                    {p.regularOpeningHours?.openNow !== undefined && <span>&bull;</span>}
                                    <span>{calculateDistance(myLoc.lat, myLoc.lng, p.location.latitude, p.location.longitude).toFixed(1)} km</span>
                                  </>
                                )}
                              </div>
                              
                              <div className="text-xs text-slate-400 mt-1 line-clamp-1" title={p.formattedAddress}>{p.formattedAddress}</div>
                           </div>
                           <div className="flex-shrink-0 ml-2">
                             <button
                               type="button"
                               onClick={(e) => handleDirectSave(p, e)}
                               disabled={saving || isSaved}
                               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                 isSaved 
                                   ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                   : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                               }`}
                             >
                               {isSaved ? 'Disimpan' : saving ? 'Proses..' : 'Simpan'}
                             </button>
                           </div>
                         </div>
                       );
                    })}
                    {isLoadingMorePlaces && (
                      <div className="p-4 text-center">
                        <div className="w-5 h-5 mx-auto border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      </div>
                    )}
                 </div>
               )}
               {showPredictions && searchQuery.length >= 3 && predictions.length === 0 && !isSearchingPlaces && (
                 <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-100 p-4 text-center">
                    <div className="text-sm font-semibold text-slate-600">Lokasi tidak ditemukan</div>
                 </div>
               )}
             </div>
          ) : activeAddTab === 'bulk' ? (
             <div className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Kata Kunci (Kombinasi)</label>
                   <textarea
                      value={bulkKeywords}
                      onChange={(e) => setBulkKeywords(e.target.value)}
                      rows={5}
                      className="mt-1 w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      placeholder="Masukkan kata kunci, pisahkan dengan baris baru (enter)"
                   ></textarea>
                   <p className="text-[10px] text-slate-500 mt-1">Setiap baris akan dicari terpisah. Contoh: Service hp\nSmartphone repair</p>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Area / Wilayah Target</label>
                   <input
                      type="text"
                      value={bulkArea}
                      onChange={(e) => setBulkArea(e.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Contoh: Bandung atau Kecamatan Coblong"
                   />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase text-teal-600">Filter Positif (Wajib Ada)</label>
                      <textarea
                         value={bulkPositiveFilter}
                         onChange={(e) => setBulkPositiveFilter(e.target.value)}
                         rows={4}
                         className="mt-1 w-full border border-teal-200 rounded-lg p-3 text-[11px] focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                         placeholder="Kata yang HARUS ada di nama/kategori toko"
                      ></textarea>
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase text-rose-600">Filter Negatif (Pengecualian)</label>
                      <textarea
                         value={bulkNegativeFilter}
                         onChange={(e) => setBulkNegativeFilter(e.target.value)}
                         rows={4}
                         className="mt-1 w-full border border-rose-200 rounded-lg p-3 text-[11px] focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                         placeholder="Kata yang BIKIN DITOLAK jika ada di nama/kategori toko"
                      ></textarea>
                   </div>
                </div>
                
                {isBulkSearching && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-700 animate-pulse">{bulkProgress.message}</span>
                        <button 
                           onClick={() => bulkStopRef.current = true}
                           className="px-3 py-1 bg-red-100 text-red-600 rounded-md text-xs font-bold hover:bg-red-200"
                        >
                           Berhenti
                        </button>
                     </div>
                     <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}></div>
                     </div>
                     <div className="text-right text-[10px] text-slate-500 mt-1">
                        {bulkProgress.current} dari {bulkProgress.total} kata kunci (Maks 60 hasil per kata kunci)
                     </div>
                  </div>
                )}
                
                {!isBulkSearching && bulkResults.length === 0 && (
                   <button
                      onClick={handleBulkSearch}
                      disabled={isBulkSearching}
                      className="bg-indigo-600 text-white w-full rounded-lg py-3 font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors"
                   >
                      <Search className="w-4 h-4" /> Temukan Lokasi
                   </button>
                )}
                
                {bulkResults.length > 0 && (
                  <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                     <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedBulkIds.length === bulkResults.length && bulkResults.length > 0} 
                              onChange={(e) => {
                                 if (e.target.checked) setSelectedBulkIds(bulkResults.map(r => r.placeId));
                                 else setSelectedBulkIds([]);
                              }}
                              className="rounded border-slate-300 w-4 h-4 text-indigo-600"
                            />
                            <span className="text-xs font-bold text-slate-700">Pilih Semua ({selectedBulkIds.length}/{bulkResults.length})</span>
                        </label>
                        <button
                           onClick={handleSaveSelectedBulk}
                           disabled={isBulkSaving || selectedBulkIds.length === 0}
                           className="bg-indigo-600 text-white px-4 py-1.5 rounded-md font-bold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                           {isBulkSaving ? 'Menyimpan...' : 'Simpan yang Dipilih'}
                        </button>
                     </div>
                     <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                        {bulkResults.slice(0, bulkPage * BULK_ITEMS_PER_PAGE).map(place => (
                           <label key={place.placeId} className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={selectedBulkIds.includes(place.placeId)}
                                onChange={(e) => {
                                   if (e.target.checked) setSelectedBulkIds(prev => [...prev, place.placeId]);
                                   else setSelectedBulkIds(prev => prev.filter(id => id !== place.placeId));
                                }}
                                className="mt-1 rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                 <div className="font-bold text-sm text-slate-800">{place.title}</div>
                                 <div className="text-xs text-slate-500 line-clamp-1">{place.address}</div>
                                 {(place.district || place.city) && (
                                   <div className="text-[10px] text-slate-400 mt-0.5">{place.locationShortDetails}</div>
                                 )}
                              </div>
                           </label>
                        ))}
                        {bulkPage * BULK_ITEMS_PER_PAGE < bulkResults.length && (
                          <div className="p-3 bg-slate-50 text-center">
                            <button
                              onClick={() => setBulkPage(prev => prev + 1)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-colors"
                            >
                              Muat Lebih Banyak ({bulkResults.length - (bulkPage * BULK_ITEMS_PER_PAGE)} tersisa)
                            </button>
                          </div>
                        )}
                     </div>
                  </div>
                )}
             </div>
          ) : (
            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Paste Link Google Maps</label>
                <div className="flex mt-1 gap-2">
                  <input
                    type="text"
                    value={mapsLink}
                    onChange={e => setMapsLink(e.target.value)}
                    className="flex-1 w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="Contoh: https://maps.app.goo.gl/..."
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 rounded-lg font-bold flex items-center gap-2 shadow-md shadow-rose-200 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{loading ? 'Memproses...' : 'Ekstrak'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {info && (
            <div className="mt-8 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Hasil Ekstraksi Link</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Nama Tempat</div>
                      {info.placeType && (
                        <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 rounded-full">{info.placeType}</div>
                      )}
                    </div>
                    <input 
                      type="text"
                      className="w-full text-sm font-black text-slate-800 border-b border-slate-200 pb-1 outline-none focus:border-indigo-500 focus:ring-0 bg-transparent transition-colors"
                      value={info.title || ''}
                      onChange={(e) => setInfo({ ...info, title: e.target.value })}
                      placeholder="Masukkan nama customer"
                    />
                  </div>
                  
                  {info.rating && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Rating</div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-black text-slate-800 text-lg">
                          {info.rating}
                          <Star className="w-5 h-5 fill-amber-400 text-amber-400 relative -top-[1px]" />
                        </span>
                        {info.userRatingCount && (
                          <span className="text-sm font-medium text-slate-500">
                            ({info.userRatingCount} ulasan)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Kecamatan / Kabupaten / Kota</div>
                    <div className="text-sm font-bold text-slate-700">
                      {info.district || info.city ? (
                        <>{info.district ? `${info.district}, ` : ''}{info.city || ''}</>
                      ) : 'Tidak dapat diidentifikasi (gunakan link dengan marker spesifik)'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Alamat Lengkap</div>
                    <div className="text-xs font-medium text-slate-600 line-clamp-3">{info.address || 'Alamat tidak ditemukan'}</div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col items-start md:items-end md:text-right">
                  <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                       <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
                         <MapPin className="w-4 h-4 text-indigo-600" /> Koordinat GPS
                       </div>
                       <button onClick={getMyLocation} disabled={gettingMyLoc} className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-colors">
                          <RefreshCw className={`w-3 h-3 ${gettingMyLoc ? 'animate-spin' : ''}`} /> Refresh
                       </button>
                    </div>
                    
                    {myLocAccuracy && (
                      <div className={`text-xs font-bold text-center p-2 rounded-lg mb-3 ${myLocAccuracy <= 20 ? 'bg-emerald-100 text-emerald-700' : myLocAccuracy <= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        Akurasi: {Math.round(myLocAccuracy)} meter {myLocAccuracy <= 20 ? '(Akurat)' : myLocAccuracy <= 50 ? '(Akurasi Sedang)' : '(Kurang Akurat)'}
                      </div>
                    )}

                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center md:justify-end gap-1 mt-4">
                      <Navigation className="w-3 h-3 text-indigo-500" /> Jarak dari Lokasi Anda Saat Ini
                    </div>
                    
                    {gettingMyLoc && !myLoc ? (
                       <div className="text-sm font-medium text-slate-500 animate-pulse text-right">Menunggu GPS...</div>
                    ) : info.lat && info.lng && myLoc ? (
                       <div className="flex flex-col items-end">
                          <div className="text-3xl font-black text-indigo-600 tracking-tight text-right flex items-baseline gap-1">
                            {info.isApproximate && <span className="text-lg">~</span>}
                            {calculatingDriving ? (
                               <span className="text-xl text-slate-400 animate-pulse">Menghitung rute...</span>
                            ) : drivingDistance !== null ? (
                               <>{drivingDistance.toFixed(2)} <span className="text-base text-slate-400 font-bold">km</span></>
                            ) : (
                               <>{calculateDistance(myLoc.lat, myLoc.lng, info.lat, info.lng).toFixed(2)} <span className="text-base text-slate-400 font-bold">km</span></>
                            )}
                          </div>
                          {info.isApproximate && (
                             <div className="text-[10px] text-amber-600 font-bold max-w-[200px] text-right mt-1 leading-tight bg-amber-50 p-1.5 rounded-md border border-amber-100">Jarak perkiraan berdasarkan kecamatan/kota karena link asli tidak menyertakan koordinat GPS pasti.</div>
                          )}
                          {!calculatingDriving && drivingDistance !== null && (
                             <div className="text-[10px] text-slate-400 font-medium text-right mt-1">
                                 Berdasarkan jarak rute berkendara {config?.googleMapsKeyExists ? '(Akurat)' : '(OSRM)'}
                             </div>
                          )}
                       </div>
                    ) : !myLoc ? (
                      <div className="text-xs text-rose-500 font-bold text-right pt-1">Akses Lokasi Dibutuhkan</div>
                    ) : (
                      <div className="text-xs text-slate-500 text-right">Koordinat tujuan tidak ditemukan dari link tersebut.</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                 <button 
                   onClick={handleSaveInfo}
                   disabled={saving}
                   className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md transition-colors disabled:opacity-50"
                 >
                   {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/> : <Save className="w-4 h-4" />}
                   Simpan ke Database
                 </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          
          {syncState.active && (
             <MapsSyncStatus syncState={syncState} setSyncState={setSyncState} />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Daftar Kunjungan (Planning)</CardTitle>
              <p className="text-xs text-slate-500 font-medium mt-1">Diurutkan dari jarak terdekat ke terjauh berdasarkan posisi saat ini.</p>
              
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                 <button
                   onClick={() => setActiveListTab('semua')}
                   className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeListTab === 'semua' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                 >
                   Semua Data
                 </button>
                 <button
                   onClick={() => setActiveListTab('rencana')}
                   className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeListTab === 'rencana' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                 >
                   <MapPin className="w-3.5 h-3.5" />
                   Rencana Hari Ini ({plannedVisitIds.length})
                 </button>
                 <button
                   onClick={() => setActiveListTab('hasil_survey')}
                   className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeListTab === 'hasil_survey' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                 >
                   <ClipboardList className="w-3.5 h-3.5" />
                   Hasil Survey
                 </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari global..." 
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  className="pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg w-full sm:w-48 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {globalSearch && (
                  <button 
                    type="button"
                    onClick={() => setGlobalSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={travelMode}
                onChange={e => setTravelMode(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700 font-medium cursor-pointer"
                title="Moda Kendaraan untuk Jarak Berkendara"
              >
                <option value="DRIVE">Mobil</option>
                <option value="TWO_WHEELER">Motor</option>
              </select>

              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1 bg-white">
                <span className="text-xs font-bold text-slate-500">Toleransi</span>
                <input
                  type="number"
                  value={surveyTolerance}
                  onChange={(e) => setSurveyTolerance(Number(e.target.value))}
                  onBlur={() => saveSurveyTolerance(surveyTolerance)}
                  className="w-16 text-xs text-center border-none focus:ring-0 outline-none font-bold text-slate-700 bg-slate-50 rounded"
                  title="Toleransi Jarak Absen Survey (meter)"
                />
                <span className="text-xs font-bold text-slate-500">m</span>
              </div>

              {selectedIds.length > 0 && activeListTab === 'semua' && (
                <button 
                  onClick={() => {
                     const selectedStores = filteredData.filter(d => selectedIds.includes(d.id) && d.lat && d.lng);
                     if (selectedStores.length === 0) {
                        showAlert('Pilih setidaknya 1 toko yang memiliki koordinat.', 'warning');
                        return;
                     }
                     const newPlannedIds = [...new Set([...plannedVisitIds, ...selectedStores.map(s => s.id)])];
                     setPlannedVisitIds(newPlannedIds);
                     showAlert(`Berhasil menambahkan ${selectedStores.length} toko ke Rencana Hari Ini`, 'success');
                     setSelectedIds([]);
                  }}
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Navigation2 className="w-3.5 h-3.5" />
                  Rencanakan ({selectedIds.length})
                </button>
              )}

              {selectedIds.length > 0 && activeListTab === 'rencana' && (
                <>
                  <button 
                    onClick={() => {
                       const selectedStores = filteredData.filter(d => selectedIds.includes(d.id) && d.lat && d.lng);
                       if (selectedStores.length === 0) {
                          showAlert('Pilih setidaknya 1 toko yang memiliki koordinat.', 'warning');
                          return;
                       }
                       const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStores[selectedStores.length-1]?.lat},${selectedStores[selectedStores.length-1]?.lng}${selectedStores.length > 1 ? '&waypoints=' + selectedStores.slice(0, selectedStores.length-1).map(s => `${s?.lat},${s?.lng}`).join('|') : ''}`;
                       window.open(url, '_blank');
                    }}
                    className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Map className="w-3.5 h-3.5" />
                    Buka Rute di Maps ({selectedIds.length})
                  </button>
                  <button 
                    onClick={() => {
                       setPlannedVisitIds(prev => prev.filter(id => !selectedIds.includes(id)));
                       setSelectedIds([]);
                    }}
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Hapus dari Rencana ({selectedIds.length})
                  </button>
                </>
              )}

              {selectedIds.length > 0 && activeListTab === 'semua' && (
                <button 
                  onClick={handleBulkDelete}
                  disabled={deletingBulk}
                  className="bg-rose-100 text-rose-600 hover:bg-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus ({selectedIds.length})
                </button>
              )}

              <button 
                onClick={handleResetFilters}
                className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
                title="Reset Filter"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>

              <button
                onClick={handleDownloadExcel}
                className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                title="Download Excel"
              >
                <Download className="w-3.5 h-3.5" /> Download XLS
              </button>

              <button
                onClick={executePreviewHtml}
                className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-100 flex items-center gap-1.5 transition-colors"
                title="Preview HTML"
              >
                <i className="fa-solid fa-eye w-3.5 h-3.5 text-center"></i> Preview
              </button>

              <button
                onClick={executeDownloadHtml}
                className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-100 flex items-center gap-1.5 transition-colors"
                title="Download HTML Offline App"
              >
                <Download className="w-3.5 h-3.5" /> HTML App
              </button>

              <button
                onClick={handleSyncKecamatanKota}
                disabled={syncingData}
                className="text-[11px] sm:text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-lg hover:bg-teal-100 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                title="Perbaiki Data Kecamatan/Kota lama"
              >
                <Wand2 className={`w-3.5 h-3.5 ${syncingData ? 'animate-pulse' : ''}`} /> 
                {syncingData ? 'Proses...' : 'Perbaiki Kota/Kec'}
              </button>

              <button
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${showDuplicatesOnly ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Tampilkan Duplikat
              </button>

              <button 
                onClick={getMyLocation} 
                disabled={gettingMyLoc}
                className="text-[11px] sm:text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto mt-2 sm:mt-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gettingMyLoc ? 'animate-spin' : ''}`} /> 
                {gettingMyLoc ? 'Mengupdate...' : 'Refresh Lokasi'}
              </button>
            </div>
          </div>
        </CardHeader>
        {activeListTab === 'hasil_survey' ? (
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
               <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-black">
                 <tr>
                   <th className="px-5 py-4">Nama Toko</th>
                   <th className="px-5 py-4">No Telp</th>
                   <th className="px-5 py-4">Brand LCD (Qty/Omset/Dari)</th>
                   <th className="px-5 py-4">Brand Baterai (Qty/Omset/Dari)</th>
                   <th className="px-5 py-4">Alamat Original</th>
                   <th className="px-5 py-4 text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {allSurveyData.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        Belum ada data hasil survey LCD.
                      </td>
                   </tr>
                 ) : (
                   allSurveyData.map((item, index) => (
                     <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                       <td className="px-5 py-4 font-bold text-slate-800">{item.nama_toko}</td>
                       <td className="px-5 py-4 text-xs">{item.no_telp || '-'}</td>
                       <td className="px-5 py-4 text-xs">
                         <div className="font-semibold">{item.brand_lcd || '-'}</div>
                         <div className="text-emerald-600">{item.qty_lcd} / {item.omset_lcd}</div>
                         <div className="text-slate-400">Dari: {item.order_lcd_dari || '-'}</div>
                       </td>
                       <td className="px-5 py-4 text-xs">
                         <div className="font-semibold">{item.brand_baterai || '-'}</div>
                         <div className="text-emerald-600">{item.qty_baterai} / {item.omset_baterai}</div>
                         <div className="text-slate-400">Dari: {item.order_baterai_dari || '-'}</div>
                       </td>
                       <td className="px-5 py-4 text-xs line-clamp-3 min-w-[200px]">{item.alamat_asli || '-'}</td>
                       <td className="px-5 py-4">
                         <div className="flex items-center justify-center gap-2">
                           <a 
                             href={item.latitude && item.longitude ? `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}` : '#'} 
                             target="_blank" 
                             rel="noreferrer"
                             className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                             title="Buka di Google Maps"
                           >
                             <MapPin className="w-4 h-4" />
                           </a>
                           <button 
                             onClick={() => {
                               showConfirm('Hapus Survey?', `Yakin ingin menghapus survey toko ${item.nama_toko}?`, async () => {
                                 try {
                                   const { error } = await supabase.from('survey_lcd').delete().eq('id', item.id);
                                   if (error) throw error;
                                   showAlert('Survey berhasil dihapus', 'success');
                                   setAllSurveyData(prev => prev.filter(d => d.id !== item.id));
                                 } catch (err: any) {
                                   showAlert(err.message, 'error');
                                 }
                               });
                             }}
                             className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 flex items-center justify-center transition-colors"
                             title="Hapus Survey"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-black">
              <tr>
                <th className="px-5 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-5 py-4">Nama Customer</th>
                <th className="px-5 py-4">Kecamatan/Kota</th>
                <th className="px-5 py-4">Alamat Lengkap</th>
                <th className="px-5 py-4 text-center">Hasil Survey</th>
                <th className="px-5 py-4">Jarak</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
              <tr className="bg-slate-50 border-t border-slate-100">
                <th className="px-5 py-2"></th>
                <th className="px-5 py-2">
                  <div className="relative">
                    <input type="text" placeholder="Filter Nama..." value={filterName} onChange={e => setFilterName(e.target.value)} className="w-full text-xs font-normal border border-slate-200 rounded p-1.5 pr-6 outline-none focus:border-indigo-400" />
                    {filterName && (
                      <button type="button" onClick={() => setFilterName('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2">
                  <div className="relative">
                    <input type="text" placeholder="Filter Kota..." value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)} className="w-full text-xs font-normal border border-slate-200 rounded p-1.5 pr-6 outline-none focus:border-indigo-400" />
                    {filterKecamatan && (
                      <button type="button" onClick={() => setFilterKecamatan('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2">
                  <div className="relative">
                    <input type="text" placeholder="Filter Alamat..." value={filterAlamat} onChange={e => setFilterAlamat(e.target.value)} className="w-full text-xs font-normal border border-slate-200 rounded p-1.5 pr-6 outline-none focus:border-indigo-400" />
                    {filterAlamat && (
                      <button type="button" onClick={() => setFilterAlamat('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-5 py-2"></th>
                <th className="px-5 py-2"></th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingSaved ? (
                <tr>
                   <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-medium animate-pulse">
                     Memuat data...
                   </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                     Belum ada data customer yang disimpan atau ditemukan.
                   </td>
                </tr>
              ) : (
                paginatedData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-center">
                       <input 
                         type="checkbox" 
                         checked={selectedIds.includes(item.id)}
                         onChange={() => handleSelectOne(item.id)}
                         className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                       />
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        {item.nama_customer}
                        {surveyedStoresSet.has((item.nama_customer || '').toLowerCase().trim()) && (
                           <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full text-[10px] border border-emerald-100">
                             <CheckCircle2 className="w-3 h-3" />
                             Sudah dikunjungi
                           </span>
                        )}
                      </div>
                      {(item.rating || item.place_type) && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                          {item.rating && (
                            <span className="flex items-center gap-0.5 font-bold text-slate-700">
                              {item.rating}
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400 relative -top-[1px]" />
                              {item.user_rating_count ? <span className="text-slate-500 font-normal">({item.user_rating_count})</span> : ''}
                            </span>
                          )}
                          {(item.rating || item.user_rating_count) && item.place_type && <span>&bull;</span>}
                          {item.place_type && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">{item.place_type}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {editingId === item.id ? (
                        <input 
                          type="text" 
                          value={editKecamatan} 
                          onChange={(e) => setEditKecamatan(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                      ) : (
                        <div className="font-semibold text-slate-600 text-xs">{item.kecamatan_kota || '-'}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {editingId === item.id ? (
                        <textarea 
                          value={editAlamat} 
                          onChange={(e) => setEditAlamat(e.target.value)}
                          className="w-full text-xs p-1 border rounded min-w-[200px]"
                          rows={2}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 line-clamp-2 min-w-[200px]">{item.alamat_lengkap}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 min-w-[250px]">
                      {(() => {
                        const storeNameLower = (item.nama_customer || '').toLowerCase().trim();
                        const storeSurveys = allSurveyData.filter(s => s.nama_toko && s.nama_toko.toLowerCase().trim() === storeNameLower);
                        storeSurveys.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                        const latestSurvey = storeSurveys[0];
                        
                        if (surveyedStoresSet.has(storeNameLower) && latestSurvey) {
                          return (
                             <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden text-[10px]">
                                <table className="w-full text-left">
                                  <thead className="bg-indigo-50 border-b border-indigo-100/50 text-indigo-800">
                                    <tr>
                                      <th className="px-2 py-1 font-bold border-r border-indigo-100/50">Item</th>
                                      <th className="px-2 py-1 font-bold border-r border-indigo-100/50">Brand</th>
                                      <th className="px-2 py-1 font-bold">Qty / Omset</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-slate-600 font-medium">
                                    <tr className="border-b border-slate-100">
                                      <td className="px-2 py-1 border-r border-slate-100">LCD</td>
                                      <td className="px-2 py-1 border-r border-slate-100">{latestSurvey.brand_lcd || '-'}</td>
                                      <td className="px-2 py-1">{latestSurvey.qty_lcd || '0'} / {parseInt(latestSurvey.omset_lcd || '0').toLocaleString('id-ID')}</td>
                                    </tr>
                                    <tr>
                                      <td className="px-2 py-1 border-r border-slate-100">Baterai</td>
                                      <td className="px-2 py-1 border-r border-slate-100">{latestSurvey.brand_baterai || '-'}</td>
                                      <td className="px-2 py-1">{latestSurvey.qty_baterai || '0'} / {parseInt(latestSurvey.omset_baterai || '0').toLocaleString('id-ID')}</td>
                                    </tr>
                                  </tbody>
                                </table>
                             </div>
                          );
                        }
                        
                        return <div className="text-center text-xs text-slate-400 italic">Belum ada hasil survey</div>;
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      {item.distance !== null ? (
                        <div className="flex flex-col">
                           <div className="font-black text-indigo-600 whitespace-nowrap">
                             {item.distance.toFixed(2)} km
                           </div>
                           {(item as any).isOsrm && (
                             <div className="text-[10px] text-slate-400 font-medium">
                               Jarak Berkendara {(item as any).provider === 'google' ? '(Google Maps)' : '(OSRM)'}
                             </div>
                           )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Tidak ada Kordinat</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {editingId === item.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 flex items-center justify-center transition-colors"
                              title="Simpan"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
                              title="Batal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(item)}
                              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase mr-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                 setSelectedSurveyData({
                                    nama_toko: item.nama_customer,
                                    latitude: item.lat,
                                    longitude: item.lng,
                                    alamat_asli: item.alamat_lengkap || item.kecamatan_kota || ''
                                 });
                                 setShowSurveyModal(true);
                              }}
                              className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors mr-1"
                              title="Buat Survey LCD"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                            <a 
                              href={item.final_url || (item.lat && item.lng ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}` : '#')} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                              title="Buka di Google Maps"
                            >
                              <MapPin className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 flex items-center justify-center transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3 rounded-b-xl">
            <span className="text-xs text-slate-500">
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} s/d {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} dari {filteredData.length} data
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="text-xs font-bold text-slate-700 px-3">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded text-xs font-medium border border-slate-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </Card>
      
      {showSurveyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
           <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto mt-10">
              <button 
                 autoFocus
                 onClick={() => { setShowSurveyModal(false); setSelectedSurveyData(null); }}
                 className="absolute top-4 right-4 z-[70] w-8 h-8 rounded-full bg-slate-100/80 text-slate-600 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors border shadow-sm"
              >
                 <X className="w-5 h-5" />
              </button>
              <div className="pt-2 pb-0">
                 <SurveyLcd initialData={selectedSurveyData} onClose={() => { setShowSurveyModal(false); setSelectedSurveyData(null); }} />
              </div>
           </div>
        </div>
      )}
      
      {/* HTML Preview Modal */}
      {previewHtml !== null && (
         <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setPreviewHtml(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] sm:max-w-md h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <i className="fa-solid fa-mobile-screen text-indigo-500"></i>
                     Preview Offline App
                  </h3>
                  <button onClick={() => setPreviewHtml(null)} className="text-slate-400 hover:text-rose-500 transition-colors p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="flex-1 bg-slate-100 relative">
                  <iframe 
                     srcDoc={previewHtml} 
                     className="absolute inset-0 w-full h-full border-0" 
                     title="Preview Kunjungan App"
                  />
               </div>
               <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                  <button onClick={() => setPreviewHtml(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors text-sm">
                     Tutup
                  </button>
                  <button onClick={() => { executeDownloadHtml(); setPreviewHtml(null); }} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/30 text-sm flex items-center justify-center gap-2">
                     <Download className="w-4 h-4" />
                     Download App
                  </button>
               </div>
            </div>
         </div>
      )}
      
      {/* Confirm Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
           setConfirmModal({ ...confirmModal, isOpen: false });
           confirmModal.onConfirm();
        }}
      />
    </div>
  );
}
