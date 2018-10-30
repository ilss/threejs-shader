/*
 * @Author: Liang Liang
 * @Date: 2018-10-25 11:21:56
 * @Description:
 */
(function () {
    
    
    var scene, camera, renderer;
    var geometry, material, mesh;
    var meshArray = [],
        delHexEnabled = false;
    
    var uniforms = {
        uTex: {
            // value: new THREE.TextureLoader().load( 'textures/lava/lavatile.jpg' )
            value: new THREE.TextureLoader().load( 'textures/starwars/lavatile.jpg' )
        },
        iResolution: {
            type: "v2",
            value: new THREE.Vector2( window.innerWidth, window.innerHeight )
        },
        iTime: {
            value: 0.0
        }
    };
    init();
    animate();
    
    function init() {
        scene = new THREE.Scene();
        
        camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 1, 500 );
        camera.position.z = 400;
        // camera.lookAt(new THREE.Vector3(0,0,0));
        
        // scene.add( new THREE.AmbientLight( 0x222222 ) );
        
        function param( params, entry ) {
            if ( params.hasOwnProperty( entry ) ) {
                return params[ entry ];
            }
        }
        
        var map_radius = 10;
        
        function Tile( params ) {
            this.fill = param( params, 'fill' );
            this.radius = param( params, 'radius' );
            // width = 2 * radius * cos(30)
            this.width = 2 * this.radius * 0.86603;
            this.hwidth = this.width / 2;
        }
        
        function Map( radius ) {
            this.radius = radius;
            this.tiles = {};
            
            this.getTile = function ( q, r ) {
                return this.tiles[ "q" + q + "-r" + r ];
            };
            
            this.setTile = function ( q, r, val ) {
                this.tiles[ "q" + q + "-r" + r ] = val;
            };
            
            this.generate = function () {
                var tile_radius = 50;
                
                for ( let r = -this.radius; r <= this.radius; r++ ) {
                    for ( let q = -this.radius; q <= this.radius; q++ ) {
                        if ( Math.abs( q + r ) > this.radius ) {
                            this.setTile( q, r, 0 );
                        } else {
                            this.setTile( q, r, new Tile( { radius: tile_radius, fill: '#00D2FF' } ) );
                        }
                    }
                }
                this.getTile( 0, 0 ).fill = 'red';
            };
            
            
            this.draw = function () {
                var diameter = 0;
                
                for ( var r = -this.radius; r <= this.radius; r++ ) {
                    for ( var q = -this.radius; q <= this.radius; q++ ) {
                        var tile = this.getTile( q, r );
                        
                        if ( tile.constructor.name !== "Tile" ) {
                            continue;
                        }
                        
                        if ( diameter === 0 ) {
                            diameter = (this.radius * 2 + 1) * tile.width;
                        }
                        
                        var x = (q * tile.width);
                        var y = (1.5 * r) * tile.radius;
                        var offset = 0;
                        if ( r % 2 !== 0 ) {
                            offset = (r ? r < 0 ? -1 : 1 : 0) * (Math.abs( r ) - 1) * tile.hwidth + r % 2 * tile.hwidth;
                        } else {
                            offset = r * tile.hwidth;
                        }
                        x += offset;
                        
                        var radius = tile.radius;
                        var z = 100.0 * (Math.random() - 0.5);
                        
                        var pts = [];
                        pts.push( new THREE.Vector3( x, y + radius, z ) );
                        pts.push( new THREE.Vector3( x + radius * 0.866, y + radius * 0.5, z ) );
                        pts.push( new THREE.Vector3( x + radius * 0.866, y - radius * 0.5, z ) );
                        pts.push( new THREE.Vector3( x, y - radius, z ) );
                        pts.push( new THREE.Vector3( x - radius * 0.866, y - radius * 0.5, z ) );
                        pts.push( new THREE.Vector3( x - radius * 0.866, y + radius * 0.5, z ) );
                        
                        var hex = new THREE.Shape( pts );
                        
                        geometry = new THREE.ShapeGeometry( hex );
                        
                        material = new THREE.ShaderMaterial( {
                            // attributes: attributes,
                            uniforms: uniforms,
                            // vertexShader: `
                            // varying float _alpha;
                            // varying vec2 vUv;
                            // uniform vec4 offsetRepeat;
                            // uniform float alphaProportion;
                            // varying vec3 worldPosition;
                            //  varying float	dist;
                            // uniform iResolution;
                            // void main() {
                            //     // gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                            //     vec2	center = vec2(iResolution.x / 2.0, iResolution.y / 2.0);
                            //
                            //     // vUv = uv * offsetRepeat.zw +offsetRepeat.xy;
                            //     // vec4 worldPosition = modelMatrix * vec4( vec3( position ), 1.0 );
                            //
                            //     // vec3 worldPosition = position;
                            //     // vec3 cameraToVertex = normalize( cameraPosition - worldPosition.xyz);
                            //     // _alpha = 1.0 - max( 0.0, dot( normal, cameraToVertex ) );
                            //     // _alpha = (_alpha - alphaProportion);
                            //
                            //      // _position = vec4( position, 1.0 );
                            // }`,
                            fragmentShader: `
                            // 越靠近屏幕中心越透明
                            uniform vec2 iResolution;
                             void main() {
                                    vec2	center = vec2(iResolution.x / 2.0, iResolution.y / 2.0);
                                   float	dist = distance(gl_FragCoord.xy, center) /500.;
                                   // if(dist<=0.2) discard;
                                    gl_FragColor = vec4(0, 0.05, 0.1, dist);
                              }
                            `
                            fragmentShader: `
                        uniform float iTime;
                        uniform vec2 iResolution;
                        uniform sampler2D uTex;

                        //Flaring by nimitz (twitter: @stormoid)

                        //change this value (1 to 5) or tweak the settings yourself.
                        //the gamma and spot brightness parameters can use negative values
                        #define TYPE 3

                        #if TYPE == 1
                            #define brightness 1.
                            #define ray_brightness 11.
                            #define gamma 5.
                            #define spot_brightness 4.
                            #define ray_density 1.5
                            #define curvature .1
                            #define red   7.
                            #define green 1.3
                            #define blue  1.
                            //1 -> ridged, 2 -> sinfbm, 3 -> pure fbm
                            #define noisetype 2
                            #define sin_freq 50. //for type 2
                        #elif TYPE == 2
                            #define brightness 1.5
                            #define ray_brightness 10.
                            #define gamma 8.
                            #define spot_brightness 15.
                            #define ray_density 3.5
                            #define curvature 15.
                            #define red   4.
                            #define green 1.
                            #define blue  .1
                            #define noisetype 1
                            #define sin_freq 13.
                        #elif TYPE == 3
                            #define brightness 1.5
                            #define ray_brightness 20.
                            #define gamma 1.
                            #define spot_brightness .5
                            #define ray_density 5.14
                            #define curvature 27.
                            #define red   1.
                            #define green 2.
                            #define blue  3.
                            #define noisetype 2
                            #define sin_freq 15.
                        #elif TYPE == 4
                            #define brightness 3.
                            #define ray_brightness 5.
                            #define gamma 6.
                            #define spot_brightness 1.5
                            #define ray_density 6.
                            #define curvature 90.
                            #define red   .8
                            #define green 2.
                            #define blue  2.5
                            #define noisetype 1
                            #define sin_freq 6.
                            #define YO_DAWG
                        #elif TYPE == 5
                            #define brightness 2.
                            #define ray_brightness 5.
                            #define gamma 5.
                            #define spot_brightness 1.7
                            #define ray_density 30.
                            #define curvature 1.
                            #define red   0.
                            #define green 2.0
                            #define blue  1.9
                            #define noisetype 2
                            #define sin_freq 5. //for type 2
                        #endif

                        //#define PROCEDURAL_NOISE
                        //#define YO_DAWG

                        float hash( float n ){return fract(sin(n)*43758.5453);}

                        float noise( in vec2 x )
                        {
                            #ifdef PROCEDURAL_NOISE
                                x *= 1.75;
                                vec2 p = floor(x);
                                vec2 f = fract(x);
                                f = f*f*(3.0-2.0*f);
                                float n = p.x + p.y*57.0;
                                float res = mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                                                mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y);
                                return res;
                            #else
                                // 改变数字有奇效
                                return texture2D(uTex, x*0.01).x;
                            #endif
                        }

                        mat2 m2 = mat2( 0.80,  0.60, -0.60,  0.80 );
                        float fbm( in vec2 p )
                        {
                            float z = 2.0;
                            float rz = 0.0;
                            p *= 0.25;
                            for (float i = 1.; i < 12.; i++ )
                            {
                                #if noisetype == 1
                                    rz+= abs((noise(p)-0.5)*2.)/z;
                                #elif noisetype == 2
                                    rz+= (sin(noise(p)*sin_freq)*0.5+0.5)/z;
                                #else
                                    rz+= noise(p)/z;
                                #endif
                                z = z*2.0;
                                p = p*2.0*m2;
                            }
                            return rz;
                        }

                        void main( )
                        {
                            float t = -iTime*0.03;
                            vec2 uv = gl_FragCoord.xy / iResolution.xy-0.5;
                            uv.x *= iResolution.x/iResolution.y;
                            uv*= curvature*.03+0.0001;

                            float r  = sqrt(dot(uv,uv));
                            float x = dot(normalize(uv), vec2(.5,0.))+t;
                            float y = dot(normalize(uv), vec2(.0,.5))+t;

                            #ifdef YO_DAWG
                                x = fbm(vec2(y*ray_density*0.5,r+x*ray_density*.2));
                                y = fbm(vec2(r+y*ray_density*0.1,x*ray_density*.5));
                            #endif

                            float val;
                            val = fbm(vec2(r+y*ray_density,r+x*ray_density-y));
                            val = smoothstep(gamma*.02-.1,ray_brightness+(gamma*0.02-.1)+.001,val);
                            val = sqrt(val);

                            vec3 col = val/vec3(red,green,blue);
                            col = clamp(1.-col,0.,1.);
                            col = mix(col,vec3(1.),spot_brightness-r/0.1/curvature*200./brightness);
                               vec2	center = vec2(iResolution.x / 2.0, iResolution.y / 2.0);
	                            float	dist = distance(gl_FragCoord.xy, center) /400.;
	                            // dist  = smoothstep(0.0,dist, 0.3);
	                            // if(col.b>=0.2) discard;
                                gl_FragColor = vec4(col,dist);
                        }
                        `
                        
                        } );
                        //material = new THREE.MeshLambertMaterial( { color: 0xff8000, wireframe: false } );
                        //{ color: 0x008AB8 } );
                        mesh = new THREE.Mesh( geometry, material );
                        meshArray.push( mesh );
                        scene.add( mesh );
                        
                        // Add lines
                        
                        // material = new THREE.ShaderMaterial( {
                        //     // attributes: attributes,
                        //     // uniforms: uniforms,
                        //     // vertexShader: lineVShader,
                        //     // fragmentShader: `
                        //     // // 越靠近屏幕中心越透明
                        //     // uniform vec2 iResolution;
                        //     //  void main() {
                        //     //         vec2	center = vec2(iResolution.x / 2.0, iResolution.y / 2.0);
                        //     //        float	dist = sin(distance(gl_FragCoord.xy, center))/15000.0;
                        //     //        // if(dist<=0.2) discard;
                        //     //         gl_FragColor = vec4(0, 0.05, 0.5, dist);
                        //     //   }
                        //     // `
                        // } );
                        //
                        // var geometry = new THREE.Geometry();
                        // z = 0;
                        //
                        // geometry.vertices.push( new THREE.Vector3( x + 0, y + radius, z ) );
                        // geometry.vertices.push( new THREE.Vector3( x + radius * 0.866, y + radius * 0.5, z ) );
                        // geometry.vertices.push( new THREE.Vector3( x + radius * 0.866, y - radius * 0.5, z ) );
                        // geometry.vertices.push( new THREE.Vector3( x + 0, y - radius, z ) );
                        // geometry.vertices.push( new THREE.Vector3( x - radius * 0.866, y - radius * 0.5, z ) );
                        // geometry.vertices.push( new THREE.Vector3( x - radius * 0.866, y + radius * 0.5, z ) );
                        // geometry.vertices.push( new THREE.Vector3( x + 0, y + radius, z ) );
                        //
                        // var line = new THREE.Line( geometry, material );
                        // scene.add( line );
                    }
                }
            };
            this.generate();
        }
        
        var map = new Map( map_radius );
        map.draw();
        
        renderer = new THREE.WebGLRenderer( {
            alpha: true
        } );
        renderer.setSize( window.innerWidth, window.innerHeight );
        
        window.addEventListener( 'resize', onWindowResize, false );
        
        function onWindowResize() {
            SEDU.camera.aspect = window.innerWidth / window.innerHeight;
            SEDU.camera.updateProjectionMatrix();
            renderer.setSize( window.innerWidth, window.innerHeight );
            uniforms.iResolution.value.x = window.innerWidth;
            uniforms.iResolution.value.y = window.innerHeight;
        }
        
        var dom = renderer.domElement;
        dom.id = 'hexMapCanvas';
        dom.style.position = 'absolute';
        dom.style.zIndex = '999';
        document.body.appendChild( dom );
        
        setTimeout( function () {
            delHexEnabled = true;
        }, 4000 );
    }
    
    var ranimationID;
    
    function animate() {
        uniforms.iTime.value += 0.05;
        ranimationID = requestAnimationFrame( animate );
        delHex();
        delHex();
        delHex();
        delHex();
        if ( meshArray.length <= 1 ) {
            cancelAnimationFrame( ranimationID ); //停止动画
            renderer.domElement.addEventListener( 'resize', null, false ); //删除侦听器来渲染
            renderer.dispose();
            // scene.dispose();
            // camera = null;
            // scene = null;
            var _dom = document.getElementById( 'hexMapCanvas' );
            document.body.removeChild( _dom );
            // _dom = document.getElementById( 'action_logo' );
            // _dom.classList.add( 'animated', 'fadeOut' );
            // setTimeout( function () {
            //     document.body.removeChild( _dom );
            // }, 1000 );
        }
        //mesh.rotation.x += 0.01;
        //mesh.rotation.y += 0.02;
        renderer.render( scene, camera );
    }
    
    function delHex() {
        if ( !delHexEnabled ) {
            return;
        }
        var index = SEDU_GLOBLE.randomNum( meshArray.length - 1 ),
            obj = meshArray[ index ];
        scene.remove( obj );
        meshArray.splice( index, 1 );
        // setInterval( function () {
        //     var index = SEDU_GLOBLE.randomNum( meshArray.length - 1 ),
        //         obj = meshArray[ index ];
        //     scene.remove( obj );
        //     console.log(index);
        //     meshArray.splice( index, 1 );
        //     // if(obj){
        //     //     obj.scale.set(0.01,0.01,0.01);
        //     // }
        // }, 100 );
    };
})();

