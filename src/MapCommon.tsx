import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import { Component } from 'react';
import { IMap, IArchivedRoute } from './Interfaces';

export type NZ50MapPolygon = L.Polygon & {nz50map: { sheetCode: string }};
export type ArchivedRoutePolygon = L.Polygon & {archivedRoute: { id: string }};


export class MapCommon<P extends {
    leafletMapId: string,
    nz50MapsBySheet: { [mapSheet: string] : IMap },
}, S, SS = any> extends Component<P, S, SS> {
    // the leaflet map
    public map: L.Map;

    // selected map sheets
    public mapSheets: string[] = [];

    // routes
    public currentRouteIndex: number = -1;
    public routes: L.Polyline[] = [];

    // NZ50 map sheets grid
    public nz50MapPolygonsBySheet: { [mapSheet: string] : NZ50MapPolygon } = {};
    public nz50LayerGroup: L.LayerGroup<NZ50MapPolygon[]>;
    public nz50MarkerLayerGroup: L.LayerGroup<L.Marker[]>;



    protected initialHeight: number = 400;
    protected  initialWidth: number = 680;

    // route markers
    protected routeMarkers: L.Marker[] = [];
    protected routeColours: string[] = ['red', 'magenta', 'cyan', 'yellow', 'deeppink', 'darkviolet', 'teal', 'orangered'];


    constructor(props:any) {
        super(props);
    }

    public adjustRoutePositionIndicators(suppressCurrentRouteMarker: boolean = false): void {
        this.routeMarkers.forEach((routeMarker: L.Marker) => {
            routeMarker.remove();
        });
        this.routeMarkers = [];
        if (this.routes.length > 0) {
            let index: number = 0;
            this.routes.forEach((route: L.Polyline) => {
                const color: string = this.routeColours[index % this.routeColours.length];
                route.setStyle({color});
                const latLngs: L.LatLng[] = route.getLatLngs() as L.LatLng[];
                if (latLngs.length > 0) {
                    if (!suppressCurrentRouteMarker || index !== this.currentRouteIndex) {
                        const label: string = this.routes.length > 1 ? (index + 1).toString() : ""; // no label if only one route
                        const divIcon = L.divIcon({
                            className: 'route-marker-div-icon',
                            html: "<div style='background-color:" + color + ";' class='marker-ring'></div><i>" + label + "</i>",
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        });
                        const routeMarker = L.marker(latLngs[0], { icon: divIcon }).addTo(this.map);
                        this.routeMarkers.push(routeMarker);
                    }
                }
                index++;
            });
        }
    }
    
    public setUpMap(): void {

        this.map = L.map(this.props.leafletMapId, {
            center: [-43.5, 172], // Central Canterbury
            zoom: 9, // Central Canterbury
            maxBounds: [[-33, 165], [-48, 179]], // New Zealand
            zoomControl: true,
            editable: true, // to enable leaflet.editable
            drawingCursor: 'crosshair',
            trackResize: false // we handle the resizing to the ResizableBox

        } as L.MapOptions);

        // tslint:disable-next-line:prefer-const
        // let baseMapLayer = 
        // L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        // 	minZoom: 6,
        // 	maxZoom: 14,
        // 	attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>) | NZ Topo map sheets sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0'
        // }).addTo(map);
        const topoLayer = L.tileLayer('http://tiles-{s}.data-cdn.linz.govt.nz/services;key=6076db4a13a14365905f8914ad7e3667/tiles/v4/layer=50767/EPSG:3857/{z}/{x}/{y}.png', {
            minZoom: 6,
            maxZoom: 16,
            subdomains:'abcd',
            attribution: '<a href=“http://data.linz.govt.nz”>Sourced from LINZ. CC BY 4.0'
        }).addTo(this.map);
        const aerialLayer = L.tileLayer('https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/{z}/{x}/{y}.webp?api=c01eg2pqbm71b75z3547szpb60k', {
            minZoom: 6,
            maxZoom: 16,
            subdomains:'abcd',
            attribution: '© <a href="//www.linz.govt.nz/linz-copyright">LINZ CC BY 4.0</a> © <a href="//www.linz.govt.nz/data/linz-data/linz-basemaps/data-attribution">Imagery Basemap contributors</a>'
        });
        L.control.layers({ "Topo": topoLayer, "Aerial": aerialLayer}, {})
            .addTo(this.map);        

        this.nz50LayerGroup = L.layerGroup()
            .addTo(this.map);
        this.nz50MarkerLayerGroup = L.layerGroup()
            .addTo(this.map);

        Object.keys(this.props.nz50MapsBySheet).map((mapSheet: string) => {
            const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];

            // the map sheet polygon
            const polygon = L.polygon(nz50Map.coords, {color: 'blue', weight: 2, fill: true, fillOpacity: 0.0}).addTo(this.nz50LayerGroup);

            // the map sheet label
            const polygonLabel = L.divIcon({className: 'sheet-div-icon',
                html: '<div class="sheet-code">' + nz50Map.sheetCode + '</div><div class="sheet-name">' + nz50Map.name + '</div>'});
            // you can set .my-div-icon styles in CSS

            // ideally would centre around polygon.getCenter()...
            const markerPos = polygon.getBounds().pad(-0.25).getNorthWest();

            L.marker(markerPos, {icon: polygonLabel, interactive: false}).addTo(this.nz50MarkerLayerGroup);

            this.nz50MapPolygonsBySheet[nz50Map.sheetCode] = polygon as NZ50MapPolygon;
        });

        this.map.on('zoomend', () => {
            if (this.map.getZoom() < 9) {
                if (this.map.hasLayer(this.nz50MarkerLayerGroup)) {
                    this.map.removeLayer(this.nz50MarkerLayerGroup);
                }
            } else {
                if (!this.map.hasLayer(this.nz50MarkerLayerGroup)) {
                    this.map.addLayer(this.nz50MarkerLayerGroup);
                }
            }
        });
    }

    public mapSheetWithName(mapSheet: string): string {
        const nz50Map: IMap = this.props.nz50MapsBySheet[mapSheet];
        return nz50Map ? nz50Map.sheetCode + ' ' + nz50Map.name : mapSheet;
    }

    public resizeMap(height?: number, width?: number): void {
        const layerControl: HTMLStyleElement = document.getElementById(this.props.leafletMapId) as HTMLStyleElement;
        if (height) {
            layerControl.style.height = Math.floor(height - 8).toString() + 'px';
        }
        if (width) {
            layerControl.style.width = Math.floor(width - 8).toString() + 'px';
        }
        this.map.invalidateSize();
    }

    public currentMapHeight(): number {
        const layerControl: HTMLStyleElement = document.getElementById(this.props.leafletMapId) as HTMLStyleElement;
        return layerControl.style.height ? parseInt(layerControl.style.height, 10) : this.initialHeight;
    }

    public currentMapWidth(): number {
        const layerControl: HTMLStyleElement = document.getElementById(this.props.leafletMapId) as HTMLStyleElement;
        return layerControl.style.width ? parseInt(layerControl.style.width, 10) : this.initialWidth;
    }

    public importGpx(gpx: string): Promise<void> {

        // HACK - UTF-16 BOM - remove, otherwise gpzx.parse won't work
        if (gpx.charCodeAt(0) === 65279) {
            gpx = gpx.substr(1);
        }
        
        return new Promise<void>((resolve, reject) => {
            const zoom = this.map.getZoom();
            const tolerance = this.getTolerance(Math.max(12, zoom));  // don't generalize too harshly when zoomed out
            new L.GPX(gpx, {
                async: true, 
                polyline_options: {},
                gpx_options:{
                    parseElements: ['track', 'route'] as any // yuk!
                },
                marker_options: {}
            }).on('addline', (event: any) => {
                const gpxLatLngs = (event.line as L.Polyline).getLatLngs() as L.LatLng[];
                const generalizedLatLngs = this.generalize(gpxLatLngs, tolerance);
                if (generalizedLatLngs.length > 0) {
                    const route = L.polyline(generalizedLatLngs, {}).addTo(this.map);
                    this.routes.push(route);
                    this.currentRouteIndex = this.routes.length - 1;
                    this.adjustRoutePositionIndicators();
                }
            }).on('loaded', (event: Event) => {
                this.fitBounds();
                resolve();
            }).on('error', (event: any) => {
                alert('Error loading file: ' + event.err);
                reject();
            });
        });
    }

    public getTolerance(zoom: number): number {
        return 22 + 240000 * Math.exp(-0.6 * zoom);
    }

    public generalize(latLngs: L.LatLng[], tolerance: number = 25): L.LatLng[] {
        const generalizedLatLngs: L.LatLng[] = [];
        let lastLatLng: L.LatLng | null = null;
        const lastIndex = latLngs.length - 1;
        latLngs.forEach((latLng: L.LatLng, index: number) => {
            if (lastLatLng === null || index === lastIndex) {
                generalizedLatLngs.push(latLng);
                lastLatLng = latLng;
            } else {
                if (latLng.distanceTo(lastLatLng) >= tolerance) {
                    generalizedLatLngs.push(latLng);
                    lastLatLng = latLng;
                }
            }
        });
        return generalizedLatLngs;
    }

    public getRoutesAsLatLngs(): Array<Array<[number, number]>> {
        return this.routes.map((route: L.Polyline) => {
            return (route.getLatLngs() as L.LatLng[]).map((latLng: L.LatLng) => {
                return [latLng.lat, latLng.lng] as [number, number]
            });
        });
    }

    public setRoutesFromLatLngs(routesAsLatLngs: Array<Array<[number, number]>>): void {
        this.routes.forEach((route: L.Polyline) => {
            route.remove();
        });
        this.routes = [];
        if (routesAsLatLngs) {
            routesAsLatLngs.forEach(routeLatLngs => {
                this.routes.push(L.polyline(routeLatLngs, {}).addTo(this.map));
                this.currentRouteIndex = this.routes.length - 1;
            });
            this.adjustRoutePositionIndicators();
        }
    }

    public fitBounds(): void {
        let bounds: L.LatLngBounds | undefined;
        if (this.routes.length > 0) {
            this.routes.forEach((route: L.Polyline) => {
                const thisBounds: L.LatLngBounds = route.getBounds();
                if (thisBounds.isValid()) {
                    if (!bounds) {
                        bounds = thisBounds;
                    } else {
                        bounds.extend(thisBounds);
                    }
                }
            })
        } else {
            if (this.mapSheets.length > 0) {
                this.mapSheets.forEach((mapSheet: string) => {
                    if (this.nz50MapPolygonsBySheet[mapSheet]) {
                        if (!bounds) {
                            bounds = this.nz50MapPolygonsBySheet[mapSheet].getBounds();
                        } else {
                            bounds.extend(this.nz50MapPolygonsBySheet[mapSheet].getBounds());
                        }
                    }
                });
            }
        }
        if (bounds) {
            this.map.fitBounds(bounds);
        }
    }
}

// -------------------------------------------------------
// -------------------------------------------------------

