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
            value: new THREE.TextureLoader().load( 'textures/water.jpg' )
            // value: new THREE.TextureLoader().load( 'textures/starwars/lavatile.jpg' )
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
                            // fragmentShader: `
                            // // 越靠近屏幕中心越透明
                            // uniform vec2 iResolution;
                            //  void main() {
                            //         vec2	center = vec2(iResolution.x / 2.0, iResolution.y / 2.0);
                            //        float	dist = distance(gl_FragCoord.xy, center) /500.;
                            //        // if(dist<=0.2) discard;
                            //         gl_FragColor = vec4(0, 0.05, 0.1, dist);
                            //   }
                            // `
                            fragmentShader: `
                        uniform float iTime;
                        uniform vec2 iResolution;
                        uniform sampler2D uTex;
                        uniform sampler2D uTex2;
                        
                        #ifdef GL_ES
                        precision mediump float;
                        #endif
                        
                        #define iterations 4
                        #define formuparam2 0.89
                        #define volsteps 10
                        #define stepsize 0.190
                        #define zoom 3.900
                        #define tile 0.450
                        #define speed2 0.010
                        #define brightness 0.2
                        #define darkmatter 0.400
                        #define distfading 0.560
                        #define saturation 0.400
                        #define transverseSpeed 1.1
                        #define cloud 0.2
                        #define PI 3.14159265359
                        
                        float triangle(float x, float a) {
                            return 2.0 * abs(2.0 * ((x / a) - floor((x / a) + 0.5))) - 1.0;
                        }
                        
                        float field( in vec3 p) {
                            float strength = 7.0 + 0.03 * log(1.e-6 + fract(sin(iTime) * 4373.11));
                            float accum = 0.0;
                            float prev = 0.0;
                            float tw = 0.0;
                            
                            for (int i = 0; i < 6; ++i) {
                                float mag = dot(p, p);
                                p = abs(p) / mag + vec3(-0.5, -0.8 + 0.1 * sin(iTime * 0.2 + 2.0), -1.1 + 0.3 * cos(iTime * 0.15));
                                float w = exp(-float(i) / 7.0);
                                accum += w * exp(-strength * pow(abs(mag - prev), 2.3));
                                tw += w;
                                prev = mag;
                            }
                            return max(0.0, 5.0 * accum / tw - 0.7);
                        }
                        
                        void main() {
                            
                            vec2 uv2 = (2.0 * (gl_FragCoord.xy / iResolution.xy)) - 1.0;
                            vec2 uvs = uv2 * iResolution.xy / max(iResolution.x, iResolution.y);
                            
                            float iTime2 = iTime  ;
                            
                            float speed = speed2;
                            speed = 0.005 * cos(iTime2 * 0.02 + PI / 4.0);
                            
                            float formuparam = formuparam2;
                            
                            // get coords and direction
                            
                            vec2 uv = uvs;
                            
                            // mouse rotation
                            float aXZ = 0.9;
                            float aYZ = -0.6;
                            float aXY = 0.9 + iTime * 0.04;
                            
                            mat2 rotXZ = mat2(cos(aXZ), sin(aXZ), -sin(aXZ), cos(aXZ));
                            mat2 rotYZ = mat2(cos(aYZ), sin(aYZ), -sin(aYZ), cos(aYZ));
                            mat2 rotXY = mat2(cos(aXY), sin(aXY), -sin(aXY), cos(aXY));
                            
                            float v2 = 1.0;
                            
                            vec3 dir = vec3(uv * zoom, 1.0);
                            vec3 from = vec3(0.0);
                            
                            from.x -= 0.5 * (-0.5);
                            from.y -= 0.5 * (-0.5);
                            
                            vec3 forward = vec3(0.0, 0.0, 1.0);
                            
                            from.x += transverseSpeed * (1.0) * cos(0.01 * iTime) + 0.001 * iTime;
                            from.y += transverseSpeed * (1.0) * sin(0.01 * iTime) + 0.001 * iTime;
                            from.z += 0.003 * iTime;
                            
                            dir.xy *= rotXY;
                            forward.xy *= rotXY;
                            
                            dir.xz *= rotXZ;
                            forward.xz *= rotXZ;
                            
                            dir.yz *= rotYZ;
                            forward.yz *= rotYZ;
                            
                            from.xy *= -rotXY;
                            from.xz *= rotXZ;
                            from.yz *= rotYZ;
                            
                            // zoom
                            float zooom = (iTime2 - 3311.0) * speed;
                            from += forward * zooom;
                            float sampleShift = mod(zooom, stepsize);
                            
                            float zoffset = -sampleShift;
                            sampleShift /= stepsize; // make from 0 to 1
                            
                            // volumetric rendering
                            float s = 0.24;
                            float s3 = s + stepsize / 2.0;
                            vec3 v = vec3(0.0);
                            float t3 = 0.0;
                            
                            vec3 backCol2 = vec3(0.);
                            for (int r = 0; r < volsteps; r++) {
                                vec3 p2 = from + (s + zoffset) * dir;
                                vec3 p3 = (from + (s3 + zoffset) * dir) * (1.9 / zoom);
                                
                                p2 = abs(vec3(tile) - mod(p2, vec3(tile * 2.0))); // tiling fold
                                p3 = abs(vec3(tile) - mod(p3, vec3(tile * 2.0))); // tiling fold
                                
                                #ifdef cloud
                                t3 = field(p3);
                                #endif
                                
                                float pa = 0.0;
                                float a = 0.0;
                                for (int i = 0; i < iterations; i++) {
                                    p2 = abs(p2) / dot(p2, p2) - formuparam; // the magic formula
                                    float D = abs(length(p2) - pa); // absolute sum of average change
                                    
                                    if (i > 2) {
                                        a += i > 7 ? min(12.0, D) : D;
                                    }
                                    pa = length(p2);
                                }
                                
                                a = a * a * a; // add contrast
                                
                                // brightens stuff up a bit
                                float s1 = s + zoffset;
                                
                                // need closed form expression for this, now that we shift samples
                                float fade = pow(distfading, max(0.0, float(r) - sampleShift));
                                
                                v += fade;
                                
                                // fade out samples as they approach the camera
                                if (r == 0)
                                    fade *= (1.0 - (sampleShift));
                                
                                // fade in samples as they approach from the distance
                                if (r == volsteps - 1)
                                    fade *= sampleShift;
                                v += vec3(s1, s1 * s1, s1 * s1 * s1 * s1) * a * brightness * fade; // coloring based on distance
                                
                                backCol2 += mix(0.4, 1.0, v2) * vec3(0.20 * t3 * t3 * t3, 0.4 * t3 * t3, t3 * 0.7) * fade;
                                
                                s += stepsize;
                                s3 += stepsize;
                            }
                            
                            v = mix(vec3(length(v)), v, saturation); // color adjust
                            
                            vec4 forCol2 = vec4(v * 0.01, 1.0);
                            
                            #ifdef cloud
                            backCol2 *= cloud;
                            #endif
                            
                            // backCol2.r *= 1.80;
                            // backCol2.g *= 0.05;
                            // backCol2.b *= 0.90;
                            
                            gl_FragColor = forCol2 + vec4(backCol2, 1.0);
                            
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





