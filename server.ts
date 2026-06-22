import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON parsing
  app.use(express.json());

  // Gemini API route
  app.post("/api/gemini", async (req, res) => {
    try {
      const { question, dataContext } = req.body;
      if (!question) {
        return res.status(400).send("Parameter 'question' tidak boleh kosong.");
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).send("GEMINI_API_KEY tidak diset pada server.");
      }

      // Dynamically import @google/genai on demand
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const SYSTEM_PROMPT = `You are a data analyst AI assistant for a KPI Monitoring Dashboard.
Your job is to answer the user's questions based on the provided database schema and data context.
When a user asks a question like "How are sales in Bandung?" you should provide a concise, insightful answer.
If asked for a query, output a valid PostgreSQL SQL query only in a markdown block.
Assume the following tables exist:
1. sales_data (id, transaction_date, region, revenue, units_sold)
2. kpi_targets (id, region, period, target_revenue, target_units)
`;

      const prompt = `${SYSTEM_PROMPT}\n\nData Context (Sample from current view):\n${dataContext || 'No data context provided'}\n\nUser Question: ${question}\n\nAnalysis/Answer:`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return res.json({ text: response.text || "Tidak ada respon dari AI." });
    } catch (error: any) {
      console.error('Error with Gemini server-side:', error);
      return res.status(500).send(error.message || "Gagal menghubungi AI.");
    }
  });

  app.post("/api/resolve-maps", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL is required' });

      // Usually goo.gl links redirect to maps.google.com/maps/place/...
      // Using redirect: manual to capture the location header without triggering captcha
      const fetchOpts: RequestInit = {
        redirect: 'manual',
        headers: {
          'User-Agent': 'curl/7.81.0'
        }
      };
      
      const getResponse = await fetch(url, fetchOpts);
      let finalUrl = getResponse.headers.get('location') || getResponse.url;

      // Handle captcha redirect
      if (finalUrl.includes('sorry/index')) {
        const urlParams = new URL(finalUrl).searchParams;
        if (urlParams.has('continue')) {
            finalUrl = decodeURIComponent(urlParams.get('continue') || finalUrl);
        }
      }

      let lat = null;
      let lng = null;
      let title = '';

      // Format 2: from !3d and !4d inside data= (Prioritize this exact pin)
      const dMatch = finalUrl.match(/!3d([-\d.]+)!4d([-\d.]+)/);
      if (dMatch) {
         lat = parseFloat(dMatch[1]);
         lng = parseFloat(dMatch[2]);
      }

      // Format 1: /@lat,lng, (Fallback to viewport)
      if (!lat || !lng) {
          const coordMatch = finalUrl.match(/@([-\d.]+),([-\d.]+),/);
          if (coordMatch) {
             lat = parseFloat(coordMatch[1]);
             lng = parseFloat(coordMatch[2]);
          }
      }

      // Extract Name and Address from /place/ URL
      let addressFromUrl = '';
      const placeMatch = finalUrl.match(/\/place\/([^\/]+)\//);
      if (placeMatch) {
         title = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
         if (title.includes(',')) {
             const parts = title.split(',');
             title = parts[0].trim();
             addressFromUrl = parts.slice(1).join(',').trim();
         }
      }
      
      // We will try to get HTML if we are missing lat, lng, or address and it's not a sorry page
      if ((!lat || !title || !addressFromUrl) && !finalUrl.includes('sorry/index')) {
         try {
           const htmlRes = await fetch(finalUrl, { headers: { 
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
             'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
           }, redirect: 'follow' });
           
           const html = await htmlRes.text();
           
           // Look at the new final url after redirects
           const resolvedUrl = htmlRes.url;
           if (!lat || !lng) {
               const dMatch = resolvedUrl.match(/!3d([-\d.]+)!4d([-\d.]+)/);
               if (dMatch) {
                  lat = parseFloat(dMatch[1]);
                  lng = parseFloat(dMatch[2]);
               } else {
                  const cMatch = resolvedUrl.match(/@([-\d.]+),([-\d.]+),/);
                  if (cMatch) {
                     lat = parseFloat(cMatch[1]);
                     lng = parseFloat(cMatch[2]);
                  }      
               }
           }
           
           // Try to extract from APP_INITIALIZATION_STATE
           const stateMatch = html.match(/window\.APP_INITIALIZATION_STATE=([^;]+);/);
           if (stateMatch) {
             try {
               // Extract coordinates like [null,null,-6.8789555,107.5329477]
               const coordsMatch = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
               if (coordsMatch && !lat) {
                  lat = parseFloat(coordsMatch[1]);
                  lng = parseFloat(coordsMatch[2]);
               }
             } catch(e) {}
           }
           
           if (!lat) {
               const metaImgMatch = html.match(/<meta content="[^"]+center=(-?\d+\.\d+)%2C(-?\d+\.\d+)[^"]+" itemprop="image"/i) || 
                                    html.match(/<meta property="og:image" content="[^"]+center=(-?\d+\.\d+)%2C(-?\d+\.\d+)[^"]+"/i);
               if (metaImgMatch) {
                   const parsedLat = parseFloat(metaImgMatch[1]);
                   const parsedLng = parseFloat(metaImgMatch[2]);
                   // Ignore Taipei default (approx 25.08, 121.56) and Singapore default (approx 1.3, 103.8)
                   const isTaipei = Math.abs(parsedLat - 25.08) < 0.2 && Math.abs(parsedLng - 121.56) < 0.2;
                   const isSingapore = Math.abs(parsedLat - 1.3) < 0.2 && Math.abs(parsedLng - 103.8) < 0.2;
                   if (!isTaipei && !isSingapore) {
                      lat = parsedLat;
                      lng = parsedLng;
                   }
               }
           }
           
           // Attempt to extract title/address from meta tags if still missing
           if (!title || !addressFromUrl) {
               const metaTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
               if (metaTitleMatch) {
                  let t = metaTitleMatch[1];
                  if (t.includes('·')) { // sometimes "Name · Address"
                      const parts = t.split('·');
                      if (!title) title = parts[0].trim();
                      if (!addressFromUrl) addressFromUrl = parts.slice(1).join('·').trim();
                  } else {
                     if (!title) title = t;
                  }
               }
               
               if (!title) {
                  const tMatch = html.match(/<title>([^<]+)<\/title>/);
                  if (tMatch) {
                     let t2 = tMatch[1].replace(' - Google Maps', '').trim();
                     if (t2.includes(',')) {
                        const parts = t2.split(',');
                        if (!title) title = parts[0].trim();
                        if (!addressFromUrl) addressFromUrl = parts.slice(1).join(',').trim();
                     } else {
                        if (!title) title = t2;
                     }
                  }
               }
           }
         } catch(e) {
           console.error("Failed to fetch HTML for title/coords:", e);
         }
      }

      // If we got the full address but no coords, try to geocode the address via Nominatim
      // so we can still get lat,lng for distance calculation
      let addressForGeocode = null;
      if (!lat && (title || addressFromUrl)) {
         addressForGeocode = `${title}, ${addressFromUrl}`.trim();
      }

      res.json({ finalUrl, lat, lng, title, addressFromUrl, addressForGeocode });
    } catch (err: any) {
      console.error('Error resolving maps url:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reverse-geocode", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
         const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: {"User-Agent": "MapsAnalyzer"} });
         if (!geoRes.ok) throw new Error('Nominatim error');
         const geoData = await geoRes.json();
         return res.json({ provider: 'nominatim', data: geoData });
      }

      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await response.json();
      return res.json({ provider: 'google', data });

    } catch (error) {
      console.error('Reverse geocode error:', error);
      res.status(500).json({ error: 'Failed to reverse geocode' });
    }
  });

  app.get("/api/geocode", async (req, res) => {
    try {
      const { q } = req.query;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
         const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&addressdetails=1&limit=1`, { headers: {"User-Agent": "MapsAnalyzer"} });
         if (!geoRes.ok) throw new Error('Nominatim error');
         const geoData = await geoRes.json();
         return res.json({ provider: 'nominatim', data: geoData });
      }

      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q as string)}&key=${apiKey}`);
      const data = await response.json();
      return res.json({ provider: 'google', data });
      
    } catch (error) {
      console.error('Geocode error:', error);
      res.status(500).json({ error: 'Failed to geocode' });
    }
  });

  app.get("/api/places/search", async (req, res) => {
    try {
      const { q, lat, lng } = req.query;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        // Fallback to Nominatim OSM
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&limit=50&addressdetails=1`, {
          headers: {"User-Agent": "MapsAnalyzerApp"}
        });
        const nomData = await nomRes.json();
        
        const places = Array.isArray(nomData) ? nomData.map((item: any) => {
          return {
            id: String(item.place_id),
            displayName: { text: item.name || item.display_name.split(',')[0] },
            formattedAddress: item.display_name,
            location: { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) },
            primaryTypeDisplayName: { text: item.type },
            addressComponents: Object.entries(item.address || {}).map(([key, val]) => ({
              longText: val,
              types: [
                key === 'city' ? 'locality' : 
                key === 'county' ? 'administrative_area_level_2' : 
                key === 'state' ? 'administrative_area_level_1' : 
                key === 'district' ? 'administrative_area_level_3' : 
                key === 'suburb' ? 'administrative_area_level_4' : key
              ]
            }))
          };
        }) : [];
        
        return res.json({ places, nextPageToken: null, isFallback: true });
      }

      if (!q) {
        return res.json({ places: [] });
      }

      const body: any = {
        textQuery: q as string,
        languageCode: 'id'
      };

      if (req.query.pageToken) {
        body.pageToken = req.query.pageToken;
      }

      if (lat && lng) {
        body.locationBias = {
          circle: {
            center: { latitude: parseFloat(lat as string), longitude: parseFloat(lng as string) },
            radius: 50000.0 // 50km bias
          }
        };
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.primaryTypeDisplayName,nextPageToken,places.rating,places.userRatingCount,places.regularOpeningHours.openNow'
         },
         body: JSON.stringify(body)
      });
      
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('Places Search err:', error);
      res.status(500).json({ error: 'Failed to fetch places search' });
    }
  });

  app.get("/api/places/details", async (req, res) => {
    try {
      const { place_id } = req.query;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: 'Google Maps API key missing' });
      }

      if (!place_id) {
        return res.status(400).json({ error: 'place_id is required' });
      }

      const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,geometry,address_components&key=${apiKey}&language=id`);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('Places Details err:', error);
      res.status(500).json({ error: 'Failed to fetch places details' });
    }
  });

  app.post("/api/distance", async (req, res) => {
    try {
      const { origins, destinations, travelMode } = req.body;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const mode = travelMode === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'DRIVE';

      if (!apiKey) {
         // Fallback to OSRM if no Google Maps API key provided
         const originStr = `${origins[0].lng},${origins[0].lat}`;
         const destsStr = destinations.map((d: any) => `${d.lng},${d.lat}`).join(';');
         const coordinates = `${originStr};${destsStr}`;
         const osrmMode = mode === 'TWO_WHEELER' ? 'bike' : 'driving'; // Note: OSRM public server has different profiles, but we'll map TWO_WHEELER -> bike or just use driving
         const osrmProfile = mode === 'TWO_WHEELER' ? 'bike' : 'driving';
         
         const osrmRes = await fetch(`https://router.project-osrm.org/table/v1/${osrmProfile}/${coordinates}?sources=0&annotations=distance`);
         if (!osrmRes.ok) throw new Error('OSRM error');
         const data: any = await osrmRes.json();
         
         if (data.code === 'Ok' && data.distances && data.distances[0]) {
            const distances = data.distances[0].slice(1).map((d: number) => d / 1000); // return array in km
            return res.json({ provider: 'osrm', distances });
         }
         return res.status(400).json({ error: 'OSRM parsing failed' });
      }

      // 1. Try Google Maps Routes API (Modern)
      try {
        const routesRes = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'distanceMeters,status,originIndex,destinationIndex'
          },
          body: JSON.stringify({
            origins: origins.map((o: any) => ({ waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } } })),
            destinations: destinations.map((d: any) => ({ waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } } })),
            travelMode: mode
          })
        });
        
        if (routesRes.ok) {
           const routesData = await routesRes.json();
           
           if (Array.isArray(routesData)) {
              if (routesData[0] && routesData[0].error) {
                 console.warn('Routes API returned error:', routesData[0].error.message);
              } else {
                 // Array of elements like { originIndex: 0, destinationIndex: 0, distanceMeters: 2500 }
                 const distances = new Array(destinations.length).fill(null);
                 routesData.forEach((item: any) => {
                    if (item.originIndex === 0 && item.destinationIndex !== undefined && item.distanceMeters !== undefined) {
                       distances[item.destinationIndex] = item.distanceMeters / 1000;
                    }
                 });
                 return res.json({ provider: 'google', distances });
              }
           }
        } else {
           console.warn('Routes API HTTP failed:', await routesRes.text());
        }
      } catch (e: any) {
        console.warn('Routes API failed:', e.message);
      }

      // 2. Try Google Maps Distance Matrix API (Legacy)
      const originsQuery = origins.map((o: any) => `${o.lat},${o.lng}`).join('|');
      const destinationsQuery = destinations.map((d: any) => `${d.lat},${d.lng}`).join('|');
      const legacyMode = mode === 'TWO_WHEELER' ? 'two_wheeler' : 'driving';
      
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsQuery}&destinations=${destinationsQuery}&mode=${legacyMode}&key=${apiKey}`);
      const data: any = await response.json();
      
      if (data.status === 'OK') {
         const distances = data.rows[0].elements.map((el: any) => el.status === 'OK' ? el.distance.value / 1000 : null);
         return res.json({ provider: 'google', distances });
      }
      
      // Fallback to OSRM on error or REQUEST_DENIED
      console.warn('Google Maps Distance APIs failed, falling back to OSRM:', data.error_message || data.status);
      
      const originStr = `${origins[0].lng},${origins[0].lat}`;
      const destsStr = destinations.map((d: any) => `${d.lng},${d.lat}`).join(';');
      const coordinates = `${originStr};${destsStr}`;
      const osrmProfileFallback = mode === 'TWO_WHEELER' ? 'bike' : 'driving';
      
      const osrmRes = await fetch(`https://router.project-osrm.org/table/v1/${osrmProfileFallback}/${coordinates}?sources=0&annotations=distance`);
      if (!osrmRes.ok) throw new Error('OSRM error');
      const osrmData: any = await osrmRes.json();
      
      if (osrmData.code === 'Ok' && osrmData.distances && osrmData.distances[0]) {
         const distances = osrmData.distances[0].slice(1).map((d: number) => d / 1000);
         return res.json({ provider: 'osrm', distances });
      }

      return res.status(400).json({ error: 'Distance Matrix API returned error', data });
      
    } catch (error) {
      console.error('Distance error:', error);
      res.status(500).json({ error: 'Failed to calculate distance' });
    }
  });

  app.get("/api/config", (req, res) => {
    res.json({
       googleMapsKeyExists: !!process.env.GOOGLE_MAPS_API_KEY
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Use custom so Vite doesn't automatically serve index.html
    });
    
    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        
        let title = "Survey Data Channel & Target";
        let icon = "📋";
        
        if (req.query.view === 'catalog-lcd') {
          title = "Pricelist LCD Vivan dan Xpas";
          icon = "📱";
        } else if (req.query.view === 'retur-barang') {
          title = "Retur Barang";
          icon = "📦";
        }
        
        template = template.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        if (icon !== "📋") {
          template = template.replace("📋", icon);
        }
        if (process.env.GOOGLE_MAPS_API_KEY) {
          template = template.replace(
            "</head>", 
            `  <script src="https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places"></script>\n</head>`
          );
        }
        
        // Add Open Graph data
        template = template.replace(
          "</head>", 
          `  <meta property="og:title" content="${title}" />\n  <meta property="og:type" content="website" />\n</head>`
        );
        
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

  } else {
    const distPath = path.join(process.cwd(), 'dist', 'client'); // Wait, vite build normally outputs to dist directly.
    const hasClientFolder = fs.existsSync(path.join(process.cwd(), 'dist', 'client'));
    const distDir = hasClientFolder ? path.join(process.cwd(), 'dist', 'client') : path.join(process.cwd(), 'dist');

    // Serve static files but intercept index.html
    app.use(express.static(distDir, { index: false }));
    
    app.get('*', (req, res) => {
      let template = fs.readFileSync(path.join(distDir, 'index.html'), "utf-8");
      
      let title = "Survey Data Channel & Target";
      let icon = "📋";
      
      if (req.query.view === 'catalog-lcd') {
        title = "Pricelist LCD Vivan dan Xpas";
        icon = "📱";
      } else if (req.query.view === 'retur-barang') {
        title = "Retur Barang";
        icon = "📦";
      }
      
      template = template.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      if (icon !== "📋") {
        template = template.replace("📋", icon);
      }
      if (process.env.GOOGLE_MAPS_API_KEY) {
        template = template.replace(
          "</head>", 
          `  <script src="https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places"></script>\n</head>`
        );
      }

      template = template.replace(
          "</head>", 
          `  <meta property="og:title" content="${title}" />\n  <meta property="og:type" content="website" />\n</head>`
      );
      
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
