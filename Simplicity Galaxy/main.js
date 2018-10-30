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
                            fragmentShader: `
                        uniform float iTime;
                        uniform vec2 iResolution;
                        uniform sampler2D uTex;
                        
                        //CBS
                        //Parallax scrolling fractal galaxy.
                        //Inspired by JoshP's Simplicity shader: https://www.shadertoy.com/view/lslGWr
                        
                        // http://www.fractalforums.com/new-theories-and-research/very-simple-formula-for-fractal-patterns/
                        float field(in vec3 p,float s) {
                            float strength = 7. + .03 * log(1.e-6 + fract(sin(iTime) * 4373.11));
                            float accum = s/4.;
                            float prev = 0.;
                            float tw = 0.;
                            for (int i = 0; i < 26; ++i) {
                                float mag = dot(p, p);
                                p = abs(p) / mag + vec3(-.5, -.4, -1.5);
                                float w = exp(-float(i) / 7.);
                                accum += w * exp(-strength * pow(abs(mag - prev), 2.2));
                                tw += w;
                                prev = mag;
                            }
                            return max(0., 5. * accum / tw - .7);
                        }
                        
                        // Less iterations for second layer
                        float field2(in vec3 p, float s) {
                            float strength = 7. + .03 * log(1.e-6 + fract(sin(iTime) * 4373.11));
                            float accum = s/4.;
                            float prev = 0.;
                            float tw = 0.;
                            for (int i = 0; i < 18; ++i) {
                                float mag = dot(p, p);
                                p = abs(p) / mag + vec3(-.5, -.4, -1.5);
                                float w = exp(-float(i) / 7.);
                                accum += w * exp(-strength * pow(abs(mag - prev), 2.2));
                                tw += w;
                                prev = mag;
                            }
                            return max(0., 5. * accum / tw - .7);
                        }
                        
                        vec3 nrand3( vec2 co )
                        {
                            vec3 a = fract( cos( co.x*8.3e-3 + co.y )*vec3(1.3e5, 4.7e5, 2.9e5) );
                            vec3 b = fract( sin( co.x*0.3e-3 + co.y )*vec3(8.1e5, 1.0e5, 0.1e5) );
                            vec3 c = mix(a, b, 0.5);
                            return c;
                        }
                        
                        
                        void main() {
                            vec2 uv = 2. * gl_FragCoord.xy / iResolution.xy - 1.;
                            vec2 uvs = uv * iResolution.xy / max(iResolution.x, iResolution.y);
                            vec3 p = vec3(uvs / 4., 0) + vec3(1., -1.3, 0.);
                            p += .2 * vec3(sin(iTime / 16.), sin(iTime / 12.),  sin(iTime / 128.));
                            
                            float freqs[4];
                            //Sound
                            freqs[0] = texture2D( uTex, vec2( 0.01, 0.25 ) ).x;
                            freqs[1] = texture2D( uTex, vec2( 0.07, 0.25 ) ).x;
                            freqs[2] = texture2D( uTex, vec2( 0.15, 0.25 ) ).x;
                            freqs[3] = texture2D( uTex, vec2( 0.30, 0.25 ) ).x;
                        
                            float t = field(p,freqs[2]);
                            float v = (1. - exp((abs(uv.x) - 1.) * 6.)) * (1. - exp((abs(uv.y) - 1.) * 6.));
                            
                            //Second Layer
                            vec3 p2 = vec3(uvs / (4.+sin(iTime*0.11)*0.2+0.2+sin(iTime*0.15)*0.3+0.4), 1.5) + vec3(2., -1.3, -1.);
                            p2 += 0.25 * vec3(sin(iTime / 16.), sin(iTime / 12.),  sin(iTime / 128.));
                            float t2 = field2(p2,freqs[3]);
                            vec4 c2 = mix(.4, 1., v) * vec4(1.3 * t2 * t2 * t2 ,1.8  * t2 * t2 , t2* freqs[0], t2);
                            
                            
                            //Let's add some stars
                            //Thanks to http://glsl.heroku.com/e#6904.0
                            vec2 seed = p.xy * 2.0;
                            seed = floor(seed * iResolution.x);
                            vec3 rnd = nrand3( seed );
                            vec4 starcolor = vec4(pow(rnd.y,40.0));
                            
                            //Second Layer
                            vec2 seed2 = p2.xy * 2.0;
                            seed2 = floor(seed2 * iResolution.x);
                            vec3 rnd2 = nrand3( seed2 );
                            starcolor += vec4(pow(rnd2.y,40.0));
                            
                            gl_FragColor = mix(freqs[3]-.3, 1., v) * vec4(1.5*freqs[2] * t * t* t , 1.2*freqs[1] * t * t, freqs[3]*t, 1.0)+c2+starcolor;
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

