import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
    // Detectar si es escritorio (PC o Mac)
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    // FAB Toggle Logic
    const toggleFab = document.getElementById('toggle-fab');
    const fabMenu = document.getElementById('fab-menu');
    const fabIconPlus = document.getElementById('fab-icon-plus');
    const fabIconClose = document.getElementById('fab-icon-close');

    if (toggleFab && fabMenu && fabIconPlus && fabIconClose) {
        const level1 = document.getElementById('menu-level-1');
        const level2 = document.getElementById('menu-level-2');
        const level3 = document.getElementById('menu-level-3');
        const btnInfo = document.getElementById('btn-info');
        const btnEntornos = document.getElementById('btn-entornos');
        const fabContainer = document.querySelector('.fab-container');

        toggleFab.addEventListener('click', () => {
            const isExpanded = toggleFab.classList.contains('expanded');
            const isLevel2Active = !level2.classList.contains('hidden');
            const isLevel3Active = !level3.classList.contains('hidden');
            const fabMainLabel = document.querySelector('.fab-main-label');

            // Si estamos en un submenú (Detalles o Entornos) y hacemos clic en el botón principal, 
            // volvemos al nivel 1 en lugar de cerrar todo el menú.
            if (isExpanded && (isLevel2Active || isLevel3Active)) {
                if (isLevel3Active) {
                    // Resetear entorno al volver desde el menú de entornos
                    currentEnvironment = null;
                    const envBtns = document.querySelectorAll('.fab-env-thumb');
                    envBtns.forEach(b => b.classList.remove('active'));
                    updateUI();
                }
                level1.classList.remove('hidden');
                level2.classList.add('hidden');
                level3.classList.add('hidden');
                return;
            }

            // Lógica normal de abrir/cerrar
            fabMenu.classList.toggle('expanded');
            toggleFab.classList.toggle('expanded');

            if (toggleFab.classList.contains('expanded')) {
                fabIconPlus.style.display = 'none';
                fabIconClose.style.display = 'block';
                if (fabMainLabel) fabMainLabel.textContent = 'Cerrar';
            } else {
                fabIconPlus.style.display = 'block';
                fabIconClose.style.display = 'none';
                if (fabMainLabel) fabMainLabel.textContent = 'Ver más';

                // Reset levels al cerrar completamente
                setTimeout(() => {
                    if (level1 && level2 && level3) {
                        level1.classList.remove('hidden');
                        level2.classList.add('hidden');
                        level3.classList.add('hidden');
                        fabContainer.classList.remove('measures-mode');
                        const btnAr = document.getElementById('btn-ar');
                        if (btnAr) {
                            if (isDesktop) {
                                btnAr.disabled = true;
                                btnAr.setAttribute('data-tooltip', "Función disponible para dispositivos móviles.");
                                btnAr.removeAttribute('title');
                            } else {
                                btnAr.disabled = false;
                                btnAr.removeAttribute('data-tooltip');
                            }
                        }

                        // Reset Medidas button state
                        const medidasIcon = document.getElementById('medidas-icon');
                        const medidasIconClose = document.getElementById('medidas-icon-close');
                        const medidasLabel = document.getElementById('medidas-label');
                        if (medidasIcon) medidasIcon.style.display = 'block';
                        if (medidasIconClose) medidasIconClose.style.display = 'none';
                        if (medidasLabel) medidasLabel.textContent = 'Medidas';

                        // Reset environment selection
                        const envBtns = document.querySelectorAll('.fab-env-thumb');
                        envBtns.forEach(b => b.classList.remove('active'));

                        // Restore product view if environment was selected
                        currentEnvironment = null;
                        updateUI();
                    }
                }, 300);
            }
        });

        if (btnInfo && level1 && level2) {
            btnInfo.addEventListener('click', () => {
                level1.classList.add('hidden');
                level2.classList.remove('hidden');
            });
        }

        if (btnEntornos && level1 && level3) {
            btnEntornos.addEventListener('click', () => {
                level1.classList.add('hidden');
                level3.classList.remove('hidden');
            });
        }
    }

    // UI Selectors
    const productViewer = document.getElementById('product-viewer');
    let colorBtns = document.querySelectorAll('.color-btn');
    let thumbBtns = document.querySelectorAll('.thumb-btn');
    const navTitle = document.getElementById('nav-title');
    const productTitle = document.getElementById('product-title');
    const productDesc = document.getElementById('product-description');
    const trafficLabel = document.getElementById('traffic-label');

    let productData = {};
    let currentDesign = 'design-1';
    let currentColor = null; // Variable persistente para el color
    let currentEnvironment = null;
    let productName = '';
    let categoryName = '';

    const colorTranslations = {
        'black': 'Negro',
        'white': 'Blanco',
        'steel': 'Acero'
    };

    async function loadProductData(productId) {
        const manifestPath = `public/productos/${productId}.json`;
        try {
            // 0. Cargar el catálogo para obtener nombres descriptivos
            const catalogRes = await fetch('public/catalog.json');
            const catalog = await catalogRes.json();
            catalog.categorias.forEach(cat => {
                const p = cat.productos.find(prod => prod.id === productId);
                if (p) {
                    productName = p.nombre;
                    categoryName = cat.nombre;
                }
            });

            // 1. Leer manifest del producto
            const manifestRes = await fetch(manifestPath);
            if (!manifestRes.ok) throw new Error(`HTTP ${manifestRes.status} al cargar ${manifestPath}`);
            const manifest = await manifestRes.json();

            // 2. Fetchear todos los designs en paralelo
            const designEntries = Object.entries(manifest.designs || {});
            const fetchedDesigns = await Promise.all(
                designEntries.map(async ([designId, designPath]) => {
                    const res = await fetch(designPath);
                    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${designPath}`);
                    const design = await res.json();
                    return [designId, design];
                })
            );

            // 3. Normalizar al formato interno que usa updateUI
            productData = {};
            for (const [designId, design] of fetchedDesigns) {
                productData[designId] = {
                    id: designId,
                    description: design.descripcion,
                    traffic: design.trafico,
                    buyLink: design.buyLink,
                    dimensions: {
                        height: design.dimensiones?.alto || '---',
                        width: design.dimensiones?.ancho || '---',
                        depth: design.dimensiones?.prof || '---'
                    },
                    thumbnail: design.thumbnail || '', // Agregaremos este campo al JSON
                    tutorialUrl: design.tutorialUrl || 'https://www.youtube.com/embed/3J1tc1fT32w',
                    pages: (design.paginas || []).map(p => ({ title: p.titulo, content: p.contenido })),
                    models: design.modelos || {},
                    arPlacement: design.arPlacement || 'wall'
                };
            }
            renderDesignOptions();
            updateUI();
        } catch (e) {
            console.error('Error cargando datos de producto:', e);
        }
    }

    // Obtener el ID del producto desde los parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || 'tork-matic-dispensador-rollo';
    loadProductData(productId);

    // Configurar el botón Volver
    document.querySelector('.back-button')?.addEventListener('click', () => {
        window.history.back();
    });

    // --- PATH GENERATION HELPER (Future-Proofed) ---
    function getModelPaths(type, design, color, env) {
        // Product data for current design and color
        const designData = productData[design];
        const colorData = (designData && designData.models[color]) ? designData.models[color] : null;

        if (env && colorData && colorData.entornos && colorData.entornos[env]) {
            const envConfig = colorData.entornos[env];
            const config = (type === 'ar') ? envConfig.ar : envConfig.preview;

            if (config) {
                return {
                    glb: config.glb || "",
                    usdz: config.usdz || ""
                };
            }
        } else if (colorData) {
            // Product-only models (not in an environment)
            return {
                glb: colorData.glb,
                usdz: colorData.usdz
            };
        }
        return { glb: "", usdz: "" };
    }

    function renderDesignOptions() {
        const designContainer = document.getElementById('design-thumbnails-container');
        if (!designContainer) return;

        designContainer.innerHTML = '';
        Object.values(productData).forEach(design => {
            const btn = document.createElement('button');
            btn.className = `thumb-btn ${design.id === currentDesign ? 'active' : ''}`;
            btn.dataset.id = design.id;
            btn.innerHTML = `
                <div class="mock-thumb flex-center">
                    <img src="${design.thumbnail || 'public/assets/images/placeholder.jpg'}" alt="${design.id}">
                </div>
            `;
            btn.onclick = () => {
                currentDesign = design.id;
                document.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateUI();
            };
            designContainer.appendChild(btn);
        });
    }

    function updateUI() {
        const data = productData[currentDesign];
        if (!data) return;

        // Actualizar Títulos
        if (navTitle && categoryName) navTitle.textContent = categoryName;
        if (productTitle && productName) productTitle.innerHTML = productName;

        // Determinar colores disponibles
        const availableColors = Object.keys(data.models);

        // Si el color actual no existe en este diseño o es nulo, elegir el primero
        if (!currentColor || !data.models[currentColor]) {
            currentColor = availableColors[0];
        }

        // Renderizar Colores dinámicamente
        const colorContainer = document.getElementById('color-options-container');
        if (colorContainer) {
            colorContainer.innerHTML = '';
            availableColors.forEach(colorId => {
                const btn = document.createElement('button');
                btn.className = `color-btn ${colorId === currentColor ? 'active' : ''}`;
                btn.dataset.color = colorId;
                const translatedName = colorTranslations[colorId] || (colorId.charAt(0).toUpperCase() + colorId.slice(1));
                btn.innerHTML = `
                    <span class="color-circle ${colorId}-color"></span>
                    <span class="color-label">${translatedName}</span>
                `;
                btn.onclick = () => {
                    currentColor = colorId;
                    updateUI();
                };
                colorContainer.appendChild(btn);
            });
        }

        // Elements to animate
        const elementsToAnimate = [productDesc, trafficLabel, productTitle];

        // Apply animation class
        elementsToAnimate.forEach(el => {
            if (el) {
                el.classList.remove('content-fade');
                void el.offsetWidth; // Trigger reflow
                el.classList.add('content-fade');
            }
        });

        // Update Text Content
        if (productDesc) productDesc.innerHTML = data.description;
        if (trafficLabel) trafficLabel.innerHTML = data.traffic;

        // --- Model Path Logic ---
        const paths = getModelPaths('preview', currentDesign, currentColor, currentEnvironment);

        // Update 3D Viewer
        if (productViewer && paths.glb) {
            // Only update and show loader if the source is actually different
            const currentSrc = productViewer.getAttribute('src');
            const newSrc = paths.glb.startsWith('./') ? paths.glb.substring(2) : paths.glb; // Normalize path for comparison if needed

            // Check if it's already the same src to avoid unnecessary flickering
            if (!productViewer.src.includes(newSrc)) {
                const mainLoader = document.getElementById('main-loader');
                if (mainLoader) mainLoader.classList.remove('hidden');
            }

            productViewer.src = paths.glb;
            if (paths.usdz) productViewer.setAttribute('ios-src', paths.usdz);
            
            // Set AR Placement
            const placement = data.arPlacement || 'wall';
            productViewer.setAttribute('ar-placement', placement);
        }
    }

    // --- Dynamic Technical Dimensions Logic ---
    const dimLinesContainer = document.getElementById('dimLines');
    const dimLines = dimLinesContainer ? dimLinesContainer.querySelectorAll('line') : [];

    function drawLine(svgLine, dotHotspot1, dotHotspot2, dimensionHotspot) {
        if (dotHotspot1 && dotHotspot2 && svgLine) {
            svgLine.setAttribute('x1', dotHotspot1.canvasPosition.x);
            svgLine.setAttribute('y1', dotHotspot1.canvasPosition.y);
            svgLine.setAttribute('x2', dotHotspot2.canvasPosition.x);
            svgLine.setAttribute('y2', dotHotspot2.canvasPosition.y);

            // Hide line if the dimension label isn't facing camera (optional for better depth effect)
            if (dimensionHotspot && !dimensionHotspot.facingCamera) {
                svgLine.classList.add('hide');
            } else {
                svgLine.classList.remove('hide');
            }
        }
    }

    const renderSVG = () => {
        if (!productViewer || !dimLinesContainer || dimLinesContainer.classList.contains('hide')) return;

        drawLine(dimLines[0], productViewer.queryHotspot('hotspot-dot+X-Y+Z'), productViewer.queryHotspot('hotspot-dot+X-Y-Z'), productViewer.queryHotspot('hotspot-dim+X-Y'));
        drawLine(dimLines[1], productViewer.queryHotspot('hotspot-dot+X-Y-Z'), productViewer.queryHotspot('hotspot-dot+X+Y-Z'), productViewer.queryHotspot('hotspot-dim+X-Z'));
        drawLine(dimLines[2], productViewer.queryHotspot('hotspot-dot+X+Y-Z'), productViewer.queryHotspot('hotspot-dot-X+Y-Z'));
        drawLine(dimLines[3], productViewer.queryHotspot('hotspot-dot-X+Y-Z'), productViewer.queryHotspot('hotspot-dot-X-Y-Z'), productViewer.queryHotspot('hotspot-dim-X-Z'));
        drawLine(dimLines[4], productViewer.queryHotspot('hotspot-dot-X-Y-Z'), productViewer.queryHotspot('hotspot-dot-X-Y+Z'), productViewer.queryHotspot('hotspot-dim-X-Y'));
    };

    if (productViewer) {
        productViewer.addEventListener('load', () => {
            // Hide loader
            const mainLoader = document.getElementById('main-loader');
            if (mainLoader) mainLoader.classList.add('hidden');

            const center = productViewer.getBoundingBoxCenter();
            const size = productViewer.getDimensions();
            const x2 = size.x / 2;
            const y2 = size.y / 2;
            const z2 = size.z / 2;

            // Update endpoints (dots)
            productViewer.updateHotspot({ name: 'hotspot-dot+X-Y+Z', position: `${center.x + x2} ${center.y - y2} ${center.z + z2}` });
            productViewer.updateHotspot({ name: 'hotspot-dot+X-Y-Z', position: `${center.x + x2} ${center.y - y2} ${center.z - z2}` });
            productViewer.updateHotspot({ name: 'hotspot-dot+X+Y-Z', position: `${center.x + x2} ${center.y + y2} ${center.z - z2}` });
            productViewer.updateHotspot({ name: 'hotspot-dot-X+Y-Z', position: `${center.x - x2} ${center.y + y2} ${center.z - z2}` });
            productViewer.updateHotspot({ name: 'hotspot-dot-X-Y-Z', position: `${center.x - x2} ${center.y - y2} ${center.z - z2}` });
            productViewer.updateHotspot({ name: 'hotspot-dot-X-Y+Z', position: `${center.x - x2} ${center.y - y2} ${center.z + z2}` });

            // Fetch technical dimensions from the current product data
            const data = productData[currentDesign];
            const dims = data ? data.dimensions : { height: '---', width: '---', depth: '---' };

            // Update Labels (dim)
            productViewer.updateHotspot({ name: 'hotspot-dim+X-Y', position: `${center.x + x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}` });
            const labelXY = productViewer.querySelector('button[slot="hotspot-dim+X-Y"]');
            if (labelXY) labelXY.innerHTML = `<span>${dims.depth}</span>`;

            productViewer.updateHotspot({ name: 'hotspot-dim+X-Z', position: `${center.x + x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}` });
            const labelXZ = productViewer.querySelector('button[slot="hotspot-dim+X-Z"]');
            if (labelXZ) labelXZ.innerHTML = `<span>${dims.height}</span>`;

            productViewer.updateHotspot({ name: 'hotspot-dim+Y-Z', position: `${center.x} ${center.y + y2 * 1.1} ${center.z - z2 * 1.1}` });
            const labelYZ = productViewer.querySelector('button[slot="hotspot-dim+Y-Z"]');
            if (labelYZ) labelYZ.innerHTML = `<span>${dims.width}</span>`;

            productViewer.updateHotspot({ name: 'hotspot-dim-X-Z', position: `${center.x - x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}` });
            const labelXZ2 = productViewer.querySelector('button[slot="hotspot-dim-X-Z"]');
            if (labelXZ2) labelXZ2.innerHTML = `<span>${dims.height}</span>`;

            productViewer.updateHotspot({ name: 'hotspot-dim-X-Y', position: `${center.x - x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}` });
            const labelXY2 = productViewer.querySelector('button[slot="hotspot-dim-X-Y"]');
            if (labelXY2) labelXY2.innerHTML = `<span>${dims.depth}</span>`;

            renderSVG();
        });

        productViewer.addEventListener('camera-change', renderSVG);
    }

    // --- Details Card Logic ---
    const btnDetalles = document.getElementById('btn-detalles');
    const detailsOverlay = document.getElementById('details-overlay');
    const detailsClose = document.getElementById('details-close');
    const carouselInner = document.getElementById('details-carousel-inner');
    const carouselIndicators = document.getElementById('details-indicators');
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const tutorialClose = document.getElementById('tutorial-close');
    const btnTutorial = document.getElementById('btn-tutorial');
    const btnBuy = document.getElementById('btn-buy');

    function toggleMainUI(show) {
        const els = document.querySelectorAll('.main-header, .main-footer, .product-details, .fab-container, .navigator-container, .main-title, .product-title');
        els.forEach(el => {
            if (show) el.classList.remove('ui-hidden');
            else el.classList.add('ui-hidden');
        });
    }

    let currentSlideIndex = 0;

    function showSlide(index) {
        const items = carouselInner.querySelectorAll('.carousel-item');
        const dots = carouselIndicators.querySelectorAll('.dot-indicator');

        if (!items.length) return;

        if (index >= items.length) currentSlideIndex = 0;
        else if (index < 0) currentSlideIndex = items.length - 1;
        else currentSlideIndex = index;

        items.forEach((item, i) => {
            item.classList.toggle('active', i === currentSlideIndex);
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlideIndex);
        });
    }

    function setupDetails() {
        const data = productData[currentDesign];
        if (!data || !data.pages) return;

        carouselInner.innerHTML = '';
        carouselIndicators.innerHTML = '';
        currentSlideIndex = 0;

        data.pages.forEach((page, index) => {
            // Create carousel item
            const item = document.createElement('div');
            item.className = 'carousel-item';
            item.innerHTML = `
                <div class="carousel-page">
                    <h4>${page.title}</h4>
                    <p>${page.content}</p>
                </div>
            `;
            carouselInner.appendChild(item);

            // Create dot indicator
            const dot = document.createElement('div');
            dot.className = 'dot-indicator';
            dot.addEventListener('click', () => showSlide(index));
            carouselIndicators.appendChild(dot);
        });

        showSlide(0);
    }

    const btnPrev = document.getElementById('details-prev');
    const btnNext = document.getElementById('details-next');

    if (btnPrev) btnPrev.addEventListener('click', () => showSlide(currentSlideIndex - 1));
    if (btnNext) btnNext.addEventListener('click', () => showSlide(currentSlideIndex + 1));

    if (btnDetalles) {
        btnDetalles.addEventListener('click', () => {
            setupDetails();
            detailsOverlay.classList.remove('hidden');
            // toggleMainUI(false); // Removed to keep background UI visible
        });
    }

    if (detailsClose) {
        detailsClose.addEventListener('click', () => {
            detailsOverlay.classList.add('hidden');
            // toggleMainUI(true); // Removed to keep background UI visible
        });
    }

    if (btnTutorial) {
        btnTutorial.addEventListener('click', () => {
            const data = productData[currentDesign];
            if (data && data.tutorialUrl) {
                const iframe = tutorialOverlay.querySelector('iframe');
                if (iframe) iframe.src = data.tutorialUrl;
            }
            tutorialOverlay.classList.remove('hidden');
        });
    }

    if (tutorialClose) {
        tutorialClose.addEventListener('click', () => {
            tutorialOverlay.classList.add('hidden');
            // Detener el video al cerrar el overlay
            const iframe = tutorialOverlay.querySelector('iframe');
            if (iframe) {
                const src = iframe.src;
                iframe.src = '';
                iframe.src = src;
            }
        });
    }

    // AR Button Trigger with Three.js / WebXR Support (Android Logic)
    const btnAr = document.getElementById('btn-ar');

    // Deshabilitar inicialmente si es escritorio
    if (btnAr && isDesktop) {
        btnAr.disabled = true;
        btnAr.setAttribute('data-tooltip', "Función disponible para dispositivos móviles.");
        btnAr.removeAttribute('title');
    }



    if (btnAr) {
        btnAr.addEventListener('click', async () => {
            const activeColorBtn = document.querySelector('.color-btn.active');
            const activeColor = activeColorBtn ? activeColorBtn.getAttribute('data-color') : 'black';

            // Use helper to get AR-specific paths
            const paths = getModelPaths('ar', currentDesign, activeColor, currentEnvironment);

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

            if (isIOS && paths.usdz) {
                const anchor = document.createElement('a');
                anchor.setAttribute('rel', 'ar');
                anchor.setAttribute('href', paths.usdz);
                const img = document.createElement('img');
                anchor.appendChild(img);
                anchor.click();
            } else if (productViewer && paths.glb) {
                const originalSrc = productViewer.src;
                if (originalSrc !== paths.glb) {
                    productViewer.src = paths.glb;
                    productViewer.addEventListener('load', () => {
                        productViewer.activateAR();
                    }, { once: true });
                } else {
                    productViewer.activateAR();
                }
            }
        });
    }

    const btnMedidas = document.getElementById('btn-medidas');
    const fabContainer = document.querySelector('.fab-container');
    const medidasIcon = document.getElementById('medidas-icon');
    const medidasIconClose = document.getElementById('medidas-icon-close');
    const medidasLabel = document.getElementById('medidas-label');

    if (btnMedidas && productViewer) {
        btnMedidas.addEventListener('click', () => {
            const dimItems = [
                ...productViewer.querySelectorAll('.dim'),
                ...productViewer.querySelectorAll('.dot'),
                dimLinesContainer
            ];
            const isHidden = dimItems[0] && dimItems[0].classList.contains('hide');
            dimItems.forEach(el => {
                if (el) {
                    if (isHidden) el.classList.remove('hide');
                    else el.classList.add('hide');
                }
            });

            // Hide other buttons when measures are active
            if (isHidden) {
                fabContainer.classList.add('measures-mode');
                if (medidasIcon) medidasIcon.style.display = 'none';
                if (medidasIconClose) medidasIconClose.style.display = 'block';
                if (medidasLabel) medidasLabel.textContent = 'Cerrar';
                if (btnAr) btnAr.disabled = true;
            } else {
                fabContainer.classList.remove('measures-mode');
                if (medidasIcon) medidasIcon.style.display = 'block';
                if (medidasIconClose) medidasIconClose.style.display = 'none';
                if (medidasLabel) medidasLabel.textContent = 'Medidas';
                if (btnAr) {
                    if (isDesktop) {
                        btnAr.disabled = true;
                        btnAr.setAttribute('data-tooltip', "Función disponible para dispositivos móviles.");
                        btnAr.removeAttribute('title');
                    } else {
                        btnAr.disabled = false;
                        btnAr.removeAttribute('data-tooltip');
                    }
                }
            }

            if (isHidden) renderSVG();
        });
    }

    if (btnBuy) {
        btnBuy.addEventListener('click', () => {
            const data = productData[currentDesign];
            if (data) {
                const activeColorBtn = document.querySelector('.color-btn.active');
                const activeColor = activeColorBtn ? activeColorBtn.getAttribute('data-color') : Object.keys(data.models)[0];
                const modelData = data.models[activeColor];

                const finalLink = (modelData && modelData.buyLink) ? modelData.buyLink : data.buyLink;

                if (finalLink) {
                    window.open(finalLink, '_blank');
                }
            }
        });
    }

    // Initial load
    updateUI();

    // Environment Change Logic
    const envBtns = document.querySelectorAll('.fab-env-thumb');

    envBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state for buttons
            envBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const envId = btn.getAttribute('data-env');
            currentEnvironment = envId; // Store active environment state

            // Centralized UI update (handles model path building)
            updateUI();

            // Hide dimensions if they were active
            const dimLinesContainer = document.getElementById('dimLines');
            if (dimLinesContainer) dimLinesContainer.classList.add('hide');

            const dims = productViewer.querySelectorAll('.dim, .dot');
            dims.forEach(d => d.classList.add('hide'));

            const fabContainer = document.querySelector('.fab-container');
            if (fabContainer) fabContainer.classList.remove('measures-mode');
        });
    });
    // Site Onboarding Logic
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    const onboardingSpotlight = document.getElementById('onboarding-spotlight');
    const onboardingCard = document.getElementById('onboarding-card');
    const onboardingText = document.getElementById('onboarding-text');
    const onboardingStepIndicator = document.getElementById('onboarding-step-indicator');
    const onboardingNext = document.getElementById('onboarding-next');
    const onboardingSkip = document.getElementById('onboarding-skip');

    const onboardingSteps = [
        {
            target: '#product-viewer',
            text: 'Puedes rotar el producto para verlo desde cualquier ángulo.',
            padding: 20
        },
        {
            target: '.fab-container',
            text: 'También puedes explorar opciones para ver tutoriales, medidas del producto y mucho más.',
            padding: 10
        },
        {
            target: '#btn-ar',
            text: '¡Además puedes ver los productos en la realidad a través de tu celular!',
            paddingX: 20,
            paddingY: 8 // Reducido para ajustar la altura solicitado por el usuario
        }
    ];

    let currentOnboardingStep = 0;

    function updateOnboarding() {
        if (!onboardingOverlay) return;

        const step = onboardingSteps[currentOnboardingStep];
        const el = document.querySelector(step.target);
        if (!el) return;

        // Desbloqueamos el scroll si estábamos en el tercer paso (especialmente en móviles)
        if (currentOnboardingStep === 2) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const waitTime = (currentOnboardingStep === 2) ? 600 : 50;

        const syncUI = () => {
            const rect = el.getBoundingClientRect();
            const px = step.paddingX !== undefined ? step.paddingX : (step.padding || 10);
            const py = step.paddingY !== undefined ? step.paddingY : (step.padding || 10);

            // Actualización del foco (spotlight) con redondeo y paddings independientes
            onboardingSpotlight.style.top = `${Math.round(rect.top - py)}px`;
            onboardingSpotlight.style.left = `${Math.round(rect.left - px)}px`;
            onboardingSpotlight.style.width = `${Math.round(rect.width + px * 2)}px`;
            onboardingSpotlight.style.height = `${Math.round(rect.height + py * 2)}px`;

            // Actualización de textos e indicador
            onboardingText.textContent = step.text;
            onboardingStepIndicator.textContent = `${currentOnboardingStep + 1} / ${onboardingSteps.length}`;

            if (currentOnboardingStep === onboardingSteps.length - 1) {
                onboardingNext.textContent = 'Empezar';
            } else {
                onboardingNext.textContent = 'Siguiente';
            }

            // Calculamos posición de la tarjeta informativa
            const cardRect = onboardingCard.getBoundingClientRect();
            let cardTop;

            if (currentOnboardingStep === 0) {
                cardTop = rect.bottom + 40;
            } else {
                cardTop = rect.top - cardRect.height - 40;
            }

            let cardLeft = rect.left + rect.width / 2 - cardRect.width / 2;

            if (cardTop < 20) cardTop = rect.bottom + 40;
            if (cardTop + cardRect.height > window.innerHeight - 20) cardTop = window.innerHeight - cardRect.height - 100;

            if (cardLeft < 20) cardLeft = 20;
            if (cardLeft + cardRect.width > window.innerWidth - 20) {
                cardLeft = window.innerWidth - cardRect.width - 20;
            }

            onboardingCard.style.top = `${cardTop}px`;
            onboardingCard.style.left = `${cardLeft}px`;
            onboardingCard.style.opacity = '1';
        };

        // Primera ejecución después del tiempo fijado
        setTimeout(() => {
            syncUI();
            // Segunda ejecución de seguridad 200ms después para iPhones lentos o scrolls inacabados
            setTimeout(syncUI, 200);
        }, waitTime);
    }

    function closeOnboarding() {
        if (onboardingOverlay) {
            onboardingOverlay.classList.add('hidden');
            localStorage.setItem('onboardingShown', 'true');
            window.removeEventListener('resize', updateOnboarding);
            // Al terminar o saltar el tutorial, regresamos suavemente al inicio de la página
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    const onboardingShown = localStorage.getItem('onboardingShown');

    if (onboardingOverlay && !onboardingShown) {
        setTimeout(() => {
            onboardingOverlay.classList.remove('hidden');
            updateOnboarding();
            window.addEventListener('resize', updateOnboarding);
        }, 1000);
    }

    if (onboardingNext) {
        onboardingNext.addEventListener('click', () => {
            onboardingCard.style.opacity = '0';
            setTimeout(() => {
                currentOnboardingStep++;
                if (currentOnboardingStep < onboardingSteps.length) {
                    updateOnboarding();
                } else {
                    closeOnboarding();
                }
            }, 150);
        });
    }

    if (onboardingSkip) {
        onboardingSkip.addEventListener('click', () => {
            closeOnboarding();
        });
    }
});
