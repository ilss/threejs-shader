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
                        
                        float snoise(vec3 uv, float res)
                        {
                            const vec3 s = vec3(1e0, 1e2, 1e4);
                            
                            uv *= res;
                            
                            vec3 uv0 = floor(mod(uv, res))*s;
                            vec3 uv1 = floor(mod(uv+vec3(1.), res))*s;
                            
                            vec3 f = fract(uv); f = f*f*(3.0-2.0*f);
                            
                            vec4 v = vec4(uv0.x+uv0.y+uv0.z, uv1.x+uv0.y+uv0.z,
                                          uv0.x+uv1.y+uv0.z, uv1.x+uv1.y+uv0.z);
                            
                            vec4 r = fract(sin(v*1e-3)*1e5);
                            float r0 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);
                            
                            r = fract(sin((v + uv1.z - uv0.z)*1e-3)*1e5);
                            float r1 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);
                            
                            return mix(r0, r1, f.z)*2.-1.;
                        }
                        
                        float freqs[4];
                        
                        void main( )
                        {
                            freqs[0] = texture2D( uTex2, vec2( 0.01, 0.05 ) ).x;
                            freqs[1] = texture2D( uTex2, vec2( 0.07, 0.05 ) ).x;
                            freqs[2] = texture2D( uTex2, vec2( 0.15, 0.25 ) ).x;
                            freqs[3] = texture2D( uTex2, vec2( 0.30, 0.25 ) ).x;
                        
                            float brightness	= freqs[1] * 0.25 + freqs[2] * 0.25;
                            float radius		= 0.24 + brightness * 0.2;
                            float invRadius 	= 1.0/radius;
                            
                            vec3 orange			= vec3( 0.8, 0.65, 0.3 );
                            vec3 orangeRed		= vec3( 0.8, 0.35, 0.1 );
                            float time		= iTime * 0.1;
                            float aspect	= iResolution.x/iResolution.y;
                            vec2 uv	  = gl_FragCoord.xy / iResolution.xy;
                            vec2 p 	= -0.5 + uv;
                            p.x *= aspect;
                        
                            float fade		= pow( length( 2.0 * p ), 0.5 );
                            float fVal1		= 1.0 - fade;
                            float fVal2	= 1.0 - fade;
                            
                            float angle	= atan( p.x, p.y )/1.2832;
                            float dist	= length(p);
                            vec3 coord	= vec3( angle, dist, time * 0.1 );
                            
                            float newTime1	= abs( snoise( coord + vec3( 0.0, -time * ( 0.35 + brightness * 0.001 ), time * 0.015 ), 15.0 ) );
                            float newTime2	= abs( snoise( coord + vec3( 0.0, -time * ( 0.15 + brightness * 0.001 ), time * 0.015 ), 45.0 ) );
                            for( int i=1; i<=3; i++ ){
                                float power = pow( 2.0, float(i + 1) );
                                fVal1 += ( 0.5 / power ) * snoise( coord + vec3( 0.0, -time, time * 0.2 ), ( power * ( 1.0 ) * ( newTime1 + 1.0 ) ) );
                                fVal2 += ( 0.5 / power ) * snoise( coord + vec3( 0.0, -time, time * 0.2 ), ( power * ( 5.0 ) * ( newTime2 + 1.0 ) ) );
                            }
                            
                            float corona		= pow( fVal1 * max( 1.1 - fade, 0.0 ), 2.0 ) * 50.0;
                            corona				+= pow( fVal2 * max( 1.1 - fade, 0.0 ), 2.0 ) * 50.0;
                            corona				*= 1.2 - newTime1;
                            vec3 sphereNormal 	= vec3( 0.0, 0.0, 1.0 );
                            vec3 dir 			= vec3( 0.0 );
                            vec3 center			= vec3( 0.5, 0.5, 1.0 );
                            vec3 starSphere		= vec3( 0.0 );
                            
                            vec2 sp = -1.0 + 2.0 * uv;
                            sp.x *= aspect;
                            sp *= ( 2.0 - brightness );
                            float r = dot(sp,sp);
                            float f = (1.0-sqrt(abs(1.0-r)))/(r) + brightness * 0.5;
                            if( dist < radius ){
                                corona			*= pow( dist * invRadius, 84.0 );
                                vec2 newUv;
                                newUv.x = sp.x*f;
                                newUv.y = sp.y*f;
                                newUv += vec2( time, 0.0 );
                                
                                vec3 texSample 	= texture2D( uTex, newUv ).rgb;
                                float uOff		= ( texSample.g * brightness * .5 + time );
                                vec2 starUV		= newUv;
                                starSphere		= texture2D( uTex, starUV ).rgb;
                            }
                            
                            float starGlow	= min( max( 1.0 - dist * ( 1.0 - brightness ), 0.0 ), 1.0 );
                            //gl_FragColor.rgb	= vec3( r );
                            gl_FragColor.rgb	= vec3( f * ( 0.75 + brightness * 0.3 ) * orange ) + starSphere + corona * orange + starGlow * orangeRed;
                            gl_FragColor.a		= .5;
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

