import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';

import  * as THREE from 'three';

import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader';

import { Tween, Easing, update } from '@tweenjs/tween.js';

import { Loader } from '@googlemaps/js-api-loader';

import * as $ from 'jquery';

import ls from 'localstorage-slim';

import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-maps',
  templateUrl: './maps.component.html',
  styleUrls: ['./maps.component.css']
})
export class MapsComponent implements OnInit, AfterViewInit {
  MapTypes: string[] = ['satellite', 'roadmap', 'hybrid', 'terrain'];
  TravelModes: string[] = ['DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'];

  startingPoint: any;
  directionsVisibility: string = 'hidden';
  routeAnimation: boolean | null = ls.get('AnimateRoute', { decrypt: true });
  StreetViewVisibility: string | null = ls.get('StreetViewVisibility', { decrypt: true });
  isStreetViewEnabled: boolean | null = ls.get('StreetViewEnabled', { decrypt: true });
  isDrawingModeEnabled: boolean | null = ls.get('DrawingMode', { decrypt: true });
  enabledMapType: string | null = ls.get('MapType', { decrypt: true });
  enabledTravelMode: string| null = ls.get('TravelMode', { decrypt: true });

  constructor(
    private _formBuilder: FormBuilder,
    private _matSnackBar: MatSnackBar,
  ) { }

  ngOnInit() {
    this.initMap();
    let lastUsedCoordinates: {lat: number, lng: number} | null = ls.get('Coordinates', { decrypt: true });

    if(lastUsedCoordinates != undefined ) {
      this.startingPoint = { lat: lastUsedCoordinates.lat, lng: lastUsedCoordinates.lng };
    } else {
      this.startingPoint = { lat: -1.2920659, lng: 36.821946199 };
    }
  }


  ngAfterViewInit(): void {
    this.loader.load()
    .then(() => {
      let checkIfTravelModeIsSet: string | null = ls.get('TravelMode', { decrypt: true});
      let checkIfMapTypeIsSet: string | null = ls.get('MapType', { decrypt: true });

      if(checkIfTravelModeIsSet == undefined || null) {
        ls.set('TravelMode', google.maps.TravelMode.DRIVING, { encrypt: true });
      } else {
        return;
      }

      if(checkIfMapTypeIsSet == undefined || null) {
        ls.set('MapType', 'roadmap', { encrypt: true });
      } else {
        return;
      }
    });
  }

  API_KEY: string = 'AIzaSyCF0eMDF9WX-Hx-OqL-v-C7TgRskObv-Js';

  MapChoice: string = '';

  loader: any = new Loader({
    'apiKey': this.API_KEY,
    'version': 'weekly',
    'libraries': [ 'geometry', 'drawing']
  });

   MapOptions = this._formBuilder.group({
     activateStreetView: '',
     activateDrawingMode: '',
     getMapType: [''],
     travelMode: [''],
     activateRouteAnimation: [''],
   });


  getMapType() {
    let param = this.MapOptions.value.getMapType;
    ls.set('MapType', param, { encrypt: true });
    window.location.reload();
  }

  getTravelMode() {
    let param = this.MapOptions.value.travelMode;
    if(param === 'DRIVING') {
      ls.set('TravelMode', google.maps.TravelMode.DRIVING, { encrypt: true });
      window.location.reload();
    } else if(param ==='TRANSIT') {
      ls.set('TravelMode', google.maps.TravelMode.TRANSIT, { encrypt: true });
      window.location.reload();
    } else if(param === 'BICYCLING') {
      ls.set('TravelMode', google.maps.TravelMode.BICYCLING, { encrypt: true });
      window.location.reload();
    } else if(param === 'WALKING') {
      ls.set('TravelMode', google.maps.TravelMode.WALKING, { encrypt: true });
      window.location.reload();
    } else {
      ls.set('TravelMode', google.maps.TravelMode.DRIVING, { encrypt: true });
      window.location.reload();
    }
  }

  setDrawingModeOptions() {
    let params = this.MapOptions.value;

    if(Boolean(params.activateDrawingMode) === false ) {
      ls.set('DrawingMode', true, { encrypt: true });
      window.location.reload();
    } else if(Boolean(params.activateDrawingMode) === true ) {
     ls.set('DrawingMode', false, { encrypt: true });
     window.location.reload();
    } else {
      ls.set('DrawingMode', false, { encrypt: true });
    }
  }

  setStreetViewOptions() {
     let params = this.MapOptions.value;

    if(Boolean(params.activateStreetView) === false ) {
      ls.set('StreetViewEnabled', true, { encrypt: true });
      ls.set('StreetViewVisibility', 'hidden', { encrypt: true });
      window.location.reload();

    } else if(Boolean(params.activateStreetView) === true ) {
      ls.set('StreetViewEnabled', false, { encrypt: true });
      ls.set('StreetViewVisibility', 'visible', { encrypt: true });
      window.location.reload();

    } else {
      ls.set('StreetViewEnabled', false, { encrypt: true });
      ls.set('StreetViewVisibility', 'visible', { encrypt: true });

    }
  }

  animateRoute() {
    if(Boolean(this.MapOptions.value.activateRouteAnimation) == false) {
      ls.set('AnimateRoute', true, { encrypt: true });
      window.location.reload();
    } else {
      ls.set('AnimateRoute', false, { encrypt: true });
      window.location.reload();
    }
  }


  initMap() {
    this.loader.load()
    .then(() => {

      const trafficLayer = new google.maps.TrafficLayer();
      const transitLayer = new google.maps.TransitLayer();
      const distanceService = new google.maps.DistanceMatrixService();
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer();

      const markerArray: google.maps.Marker[] = [];
      const stepDisplay = new google.maps.InfoWindow();

      let geocoder = new google.maps.Geocoder();
      const streetView = new google.maps.StreetViewService();
      const infoWindow = new google.maps.InfoWindow();

      let mappedLocs = new Array();
      let mappedPoints = new Array();
      let placeIdArray = [];
      let polylines: any = [];
      let  snappedCoordinates: any = [];

      let polyLocs = new Array();
      let plotLocs = new Array();

      const infoContainer = document.getElementById('map-info');
      const mapCardContentElem = document.createElement('mat-card-content');
      infoContainer?.appendChild(mapCardContentElem);

      let svgMarker = {
        path: "M10.453 14.016l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM12 2.016q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
        fillColor: "#00aabb",
        strokeColor: "#f0f7ff",
        fillOpacity: 0.9,
        rotation: 2.5,
        scale: 2.5,
        strokeWidth: 0.5,
        anchor: new google.maps.Point(15, 30),
      };


      const map = new google.maps.Map(
        document.getElementById('mapRenderer') as HTMLElement,
        {
          mapId: '98d1420b851b24cd',
          center: this.startingPoint,
          zoom: 16,
          streetViewControl: false,
          zoomControl: false,
          mapTypeControl: false,
          rotateControl: false,
          fullscreenControl: false,
          scaleControl: false,
          mapTypeId: String(ls.get('MapType', { decrypt: true }))
        }
      );

     function  animateCircle(line: google.maps.Polyline) {
      if(Boolean(ls.get('AnimateRoute', { decrypt: true })) == true) {
      let count = 0;

      window.setInterval(() => {
        count = (count + 1) % 200;
        const icons = line.get("icons");

        icons[0].offset = count / 2 + "%";
        line.set("icons", icons);
      }, 200);
    } else {
      return;
    }
  }

      function getTravelMode(): google.maps.TravelMode {
        if(ls.get('TravelMode', { decrypt: true }) == 'DRIVING') {
          return google.maps.TravelMode.DRIVING;
        } else if(ls.get('TravelMode', { decrypt: true}) == 'BICYCLING') {
          return google.maps.TravelMode.BICYCLING
        } else if(ls.get('TravelMode', { decrypt: true }) == 'WALKING') {
          return google.maps.TravelMode.WALKING;
        } else if (ls.get('TravelMode', { decrypt: true }) == 'TRANSIT') {
          return google.maps.TravelMode.TRANSIT;
        } else {
          return google.maps.TravelMode.DRIVING;
        }

      }

      const mapZoomIn = document.getElementById('zoomIn');
      if(mapZoomIn) {
        mapZoomIn.addEventListener('click', () => {
          map.setZoom(map.getZoom()! - 1);
        });
      }

      const mapZoomOut = document.getElementById('zoomOut');
      if(mapZoomOut) {
        mapZoomOut.addEventListener('click', () => {
          map.setZoom(map.getZoom()! + 1);
        });
      }

      const mapRotateLeft = document.getElementById('rotateLeft');
      if(mapRotateLeft) {
        mapRotateLeft.addEventListener('click', () => {
          map.setHeading(map.getHeading()! - 5);
          map.setTilt(map.getTilt()! - 2);
        });
      }

      const mapRotateRight = document.getElementById('rotateRight');
      if(mapRotateRight) {
        mapRotateRight.addEventListener('click', () => {
          map.setHeading(map.getHeading()! + 5);
          map.setTilt(map.getTilt()! + 2);
        });
      }

      function processSVData({ data }: google.maps.StreetViewResponse) {
        let panorama = new google.maps.StreetViewPanorama(
          document.getElementById('mapRenderer') as HTMLElement,
          {
            position:  data.location?.latLng,
            pov: {
              heading: 270,
              pitch: 0
            },
            motionTracking: true,
            motionTrackingControl: true,
            motionTrackingControlOptions: {
              position: google.maps.ControlPosition.LEFT_BOTTOM
            },
            visible: true
          }
        );
      }

      if(this.isStreetViewEnabled  == true) {
        let panorama = new google.maps.StreetViewPanorama(
          document.getElementById('mapRenderer') as HTMLElement
        );
        panorama.setVisible(true);
        streetView.getPanorama({ location: ls.get('Coordinates', { decrypt: true }), radius: 50}).then(processSVData).catch((err: any) => {
          this._matSnackBar.open(`Street View was not found on this Location`, 'Close');
        });
      } else {
        let panorama = new google.maps.StreetViewPanorama(
          document.getElementById('mapRenderer') as HTMLElement
        );
        panorama.setVisible(false);
      }

      const myLocationButton = document.getElementById('myLocation');

      if(myLocationButton) {
        myLocationButton.addEventListener('click', () => {
          navigator.geolocation.getCurrentPosition((position: any) => {
            let crd = position.coords;
            ls.set('Location', { lat: crd.latitude, lng: crd.longitude }, { encrypt: true });

            map.setCenter({ lat: crd.latitude, lng: crd.longitude });
          });
        });
      }

      const formField = document.getElementById('address') as HTMLInputElement;
      if(formField) {
        formField.addEventListener('change', (event) => {
          geocoder.geocode({ address:  (event.target as HTMLInputElement).value}, (res: any, status: any) => {
            if(status == 'OK') {
              if(res) {
                ls.set('Coordinates', { lat: res[0].geometry.location.lat(), lng: res[0].geometry.location.lng() },  { encrypt: true });
                map.setCenter(res[0].geometry.location);
              }

            } else {
              this._matSnackBar.open(`Geolocation Request was not successful. ${ status}`, 'Close');
            }
          });
        });
      }

      const showTrafficBtn = document.getElementById('showTraffic');
      if(showTrafficBtn) {
        showTrafficBtn.addEventListener('click', () => {
          trafficLayer.setMap(map);
        });
      }

      const renderIn3DBtn = document.getElementById('renderIn3D');
      if(renderIn3DBtn){
        renderIn3DBtn.addEventListener('click', () => {
          const webglOverlayView = new google.maps.WebGLOverlayView();
          let scene: any, renderer: any, camera: any, loader;
          const url =  "https://raw.githubusercontent.com/googlemaps/js-samples/main/assets/pin.gltf";

          const cameraOptions: google.maps.CameraOptions = {
            tilt: 0,
            heading: 0,
            zoom: 20
          }

          const mapOptions = {
            mapId: '98d1420b851b24cd',
            disableDefaultUI: true,
            gestureHandling: 'none',
            keyboardShortcuts: false,
            motionTracking: true,
            motionTrackingControlOptions: {
              position: google.maps.ControlPosition.LEFT_BOTTOM
            },
            ...cameraOptions
          }

          const degreesPerSecond = 3;
          function animateCamera(time: number) {
            map.moveCamera({
              heading: (time / 1000) * degreesPerSecond
            });
          }

          new Tween(cameraOptions)
          .to({ tilt: 65, heading: 150, zoom: 18}, 30000)
          .easing(Easing.Quadratic.Out)
          .onUpdate(() => {
            map.moveCamera(cameraOptions);
          })
          .start();

          function animate(time: number) {
            animateCamera(30);
            requestAnimationFrame(animate);
            update(time);
          }



          webglOverlayView.onAdd = () => {
            // Set up the Three.js scene.
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera();

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
            directionalLight.position.set(0, 10, 50);
            scene.add(directionalLight);

            // Load the 3D model with GLTF Loader from Three.js.
            loader = new GLTFLoader();
            loader.load(url, (gltf) => {
              gltf.scene.scale.set(10, 10, 10);
              gltf.scene.rotation.x = Math.PI / 1;
              //gltf.scene.rotation.y = Math.PI * 14;
              scene.add(gltf.scene);

              requestAnimationFrame(animate);
            });
          }

          webglOverlayView.onContextRestored = ({gl}) => {
            // Create the Three.js renderer, using the
            // maps's WebGL rendering context.
            renderer = new THREE.WebGLRenderer({
              canvas: gl.canvas,
              context: gl,
              ...gl.getContextAttributes(),
            });
            renderer.autoClear = false;
          }

          webglOverlayView.onDraw = ({gl,  transformer}) => {
            // Update camera matrix to ensure the model is georeferenced correctly on the map.
            const matrix = transformer.fromLatLngAltitude({
              lat:  Number(map.getCenter()?.lat()),
              lng: Number(map.getCenter()?.lng()),
              altitude: 120,
            });
            camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

            // Request a redraw and render the scene.
            webglOverlayView.requestRedraw();
            renderer.render(scene, camera);

            // Always reset the GL state.
            renderer.resetState();
          }

          webglOverlayView.setMap(map);
        });
      }

      const lineSymbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        strokeColor: "#00aabb",
      };


      if(this.isDrawingModeEnabled == true) {
        let drawingManager = new google.maps.drawing.DrawingManager({
          drawingMode: google.maps.drawing.OverlayType.POLYLINE,
          drawingControl: true,
          drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [ google.maps.drawing.OverlayType.POLYLINE ]
        },
        polylineOptions: {
          strokeColor: '#00aabb',
          strokeWeight: 10,
          strokeOpacity: 0.5,
           icons: [
             {
              icon: lineSymbol,
              offset: "100%",
             },
           ],
          }
        });

        drawingManager.setMap(map);

        // Snap-to-road when the polyline is completed.
        drawingManager.addListener('polylinecomplete', function(poly: any) {
          let path = poly.getPath();
          polylines.push(poly);
          placeIdArray = [];
          runSnapToRoad(path);
        });

        // Store snapped polyline returned by the snap-to-road service.
        function processSnapToRoadResponse(data: any) {
          placeIdArray = [];
          for (let i = 0; i < data.snappedPoints.length; i++) {
            let latlng = new google.maps.LatLng(
              data.snappedPoints[i].location.latitude,
              data.snappedPoints[i].location.longitude);
              snappedCoordinates.push(latlng);
              plotLocs.push({ lat: latlng.lat(), lng: latlng.lng() });

              placeIdArray.push(data.snappedPoints[i].placeId);
          }
        }

        // Draws the snapped polyline (after processing snap-to-road response).
        function drawSnappedPolyline() {
          let snappedPolyline = new google.maps.Polyline({
            path: snappedCoordinates,
            strokeColor: '#0c00bb',
            strokeWeight: 5,
            strokeOpacity: 0.9,
            icons: [
              {
                icon: lineSymbol,
                offset: "100%",
              },
            ],
          });

          snappedPolyline.setMap(map);
          polylines.push(snappedPolyline);
          animateCircle(snappedPolyline);
        }

        // Snap a user-created polyline to roads and draw the snapped path
        function runSnapToRoad(path: any) {
          let pathValues = [];
          for (let i = 0; i < path.getLength(); i++) {
            pathValues.push(path.getAt(i).toUrlValue());
          }

          $.get('https://roads.googleapis.com/v1/snapToRoads', {
            interpolate: true,
            key: 'AIzaSyCF0eMDF9WX-Hx-OqL-v-C7TgRskObv-Js',
            path: pathValues.join('|')
          }, function(data: any) {
            processSnapToRoadResponse(data);
            drawSnappedPolyline();
          });
        }
      } else {
        let drawingManager = new google.maps.drawing.DrawingManager({
          drawingControl: false
        });

        drawingManager.setMap(map);
      }

      map.addListener('click', (mapsMouseEvent: any) => {
        map.setCenter(mapsMouseEvent.latLng);
        this.directionsVisibility = 'visible';

        let lat: number = mapsMouseEvent.latLng.lat();
        let lng:  number = mapsMouseEvent.latLng.lng();
        let cods = { lat, lng };

        if(mapsMouseEvent.placeId == undefined) {
          this._matSnackBar.open("Must Be a Valid Place", "Close");
        } else {
          if (mappedLocs.length >= 2) {
            let info = new google.maps.InfoWindow();
            this._matSnackBar.open('Only 2 Locations Allowed.', 'Close');

          } else {
            mappedLocs.push(cods);
            mappedPoints.push({ location: { lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng()} });

            new google.maps.Marker({
            position: mapsMouseEvent.latLng,
              map: map,
              icon: svgMarker,
              animation: google.maps.Animation.DROP
            });

            if(mappedLocs.length == 2) {
              calculateAndDisplayRoute(
                directionsRenderer,
                directionsService,
                markerArray,
                stepDisplay,
                map
              );


              // Store snapped polyline returned by the snap-to-road service.
              function processSnapToRoadResponse(data: any) {
                placeIdArray = [];
                let points = data.routes[0].overview_path;
                for(let pt of points) {
                  plotLocs.push({ lat: pt.lat(), lng: pt.lng() });
                }
              }

              // Draws the snapped polyline (after processing directions response).
              function drawSnappedPolyline() {
                let snappedPolyline = new google.maps.Polyline({
                  path: plotLocs,
                  strokeColor: '#0c00bb',
                  strokeWeight: 5,
                  strokeOpacity: 0.9,
                  icons: [
                    {
                      icon: lineSymbol,
                      offset: "100%",
                    },
                  ],
                });

                snappedPolyline.setMap(map);
                polylines.push(snappedPolyline);

                animateCircle(snappedPolyline);

              }

              function calculateAndDisplayRoute(
                directionsRenderer: google.maps.DirectionsRenderer,
                directionsService: google.maps.DirectionsService,
                markerArray: google.maps.Marker[],
                stepDisplay: google.maps.InfoWindow,
                map: google.maps.Map
              ) {
                // First, remove any existing markers from the map.
                for (let i = 0; i < markerArray.length; i++) {
                  markerArray[i].setMap(null);
                }

                // Retrieve the start and end locations and create a DirectionsRequest using
                // WALKING directions.
                directionsService
                  .route({
                  origin: mappedLocs[0],
                  destination: mappedLocs[1],
                  travelMode: getTravelMode(),
                })
                .then((result: google.maps.DirectionsResult) => {
                  processSnapToRoadResponse(result);
                  drawSnappedPolyline();

                  // Route the directions and pass the response to a function to create
                  // markers for each step.

                  directionsRenderer.setDirections(result);

                  const route = result.routes[0];

                  const summaryPanel = document.createElement('mat-card-subtitle');
                  infoContainer?.appendChild(summaryPanel);

                  let warnings = document.createElement('mat-card-actions');
                  warnings.innerHTML = `${result.routes[0].warnings}`;
                  mapCardContentElem.appendChild(warnings);

                  summaryPanel.innerHTML = "";


                  // For each route, display summary information.
                  for (let i = 0; i < route.legs.length; i++) {
                    const routeSegment = i + 1;

                    //polyLocs.push({ lat: route.legs[i].start_location.lat(), lng: route.legs[i].start_location.lng() });
                    //polyLocs.push({ lat: route.legs[i].end_location.lat(), lng: route.legs[i].end_location.lng() });

                    let h3Elem = document.createElement('h3');
                    h3Elem.classList.add('text-warn');
                    h3Elem.innerText = `Route Segment:  ${ routeSegment } From: ${ route.legs[i].start_address } To: ${ route.legs[i].end_address }`;

                    let listHolderElem = document.createElement('ul');
                    //let listElem = document.createElement('li');
                    //listHolderElem.appendChild(listElem);
                    mapCardContentElem.appendChild(listHolderElem);


                    let disElem = document.createElement('button');
                    disElem.classList.add('mat-stroked-button');
                    disElem.setAttribute('color', 'warn');

                    disElem.innerText = `${ route.legs[i].distance!.text }`;

                    summaryPanel.appendChild(h3Elem);
                    summaryPanel.appendChild(disElem);
                  }
                  showSteps(result, markerArray, stepDisplay, map);
                })
                .catch((e) => {
                  window.alert("Directions request failed due to " + e);
                });


                function showSteps(
                  directionResult: google.maps.DirectionsResult,
                  markerArray: google.maps.Marker[],
                  stepDisplay: google.maps.InfoWindow,
                  map: google.maps.Map
                ) {
                  // For each step, place a marker, and add the text to the marker's infowindow.
                  // Also attach the marker to an array so we can keep track of it and remove it
                  // when calculating new routes.
                  const myRoute = directionResult!.routes[0]!.legs[0]!;

                  let matListElem = document.createElement('mat-list');
                  matListElem.setAttribute('class', 'bordered');
                  matListElem.setAttribute('class', 'bg-whiter');
                  mapCardContentElem.appendChild(matListElem);

                  for (let i = 0; i < myRoute.steps.length; i++) {
                    const marker = (markerArray[i] =
                    markerArray[i] || new google.maps.Marker());

                    marker.setMap(map);
                    marker.setPosition(myRoute.steps[i].start_location);



                    if (matListElem) {
                      let matListItemElem = document.createElement('mat-list-item');
                      matListItemElem.setAttribute('class', 'align-left');

                      let h5Elem = document.createElement('h5');
                      h5Elem.setAttribute('class', 'text-warn');
                      h5Elem.innerText = `Distance: ${myRoute.steps[i].distance!.text}  Duration: ${myRoute.steps[i].duration!.text}`;
                      matListItemElem.appendChild(h5Elem);

                      let h3Elem = document.createElement('h3');
                      h3Elem.setAttribute('class', 'text-dark');
                      h3Elem.innerHTML = `${myRoute.steps[i].instructions}`;
                      matListItemElem.appendChild(h3Elem);
                      matListElem.appendChild(matListItemElem);

                    }
                    attachInstructionText(
                      stepDisplay,
                      marker,
                      myRoute.steps[i].instructions,
                      map
                    );
                  }
                }

                function attachInstructionText(
                  stepDisplay: google.maps.InfoWindow,
                  marker: google.maps.Marker,
                  text: string,
                  map: google.maps.Map
                ) {
                  google.maps.event.addListener(marker, "click", () => {
                    // Open an info window when the marker is clicked on, containing the text
                    // of the step.
                    let matListElem = document.createElement('mat-list');
                    matListElem.setAttribute('class', 'bordered');
                    matListElem.setAttribute('class', 'bg-whiter');
                    mapCardContentElem.appendChild(matListElem);

                    if (matListElem) {
                      let matListItemElem = document.createElement('mat-list-item');
                      matListItemElem.setAttribute('class', 'align-left');

                      let h3Elem = document.createElement('h3');
                      h3Elem.setAttribute('class', 'text-dark');
                      h3Elem.innerHTML = `${text}`;
                      matListItemElem.appendChild(h3Elem);
                      matListElem.appendChild(matListItemElem);

                    }

                    stepDisplay.setContent(text);
                    stepDisplay.open(map, marker);
                  });
                }
              }
            }
          }
        }
      });
    });
  }

}


