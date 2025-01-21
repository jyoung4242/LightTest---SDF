export const shader: string = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float uRayStepSize;
uniform float uOcclusionRolloff;

// Point Light Uniforms
uniform float uPointLightPositions[100];
uniform float uPointLightIntensities[50];
uniform float uPointLightFalloffs[50];
uniform float uPointLightColors[150];
uniform int uPointLightCount;

// Ambient Light Uniforms
uniform float uAmbientLightPositions[100];
uniform float uAmbientLightColors[150];
uniform float uAmbientLightIntensities[50];
uniform int uAmbientLightCount;

// Textures
uniform sampler2D u_image; 

// Occlusion Shader Uniforms
uniform int uOccluderCount;
uniform int uOccluderShapes[50];
uniform float uOccluderPositions[100];
uniform float uOccluderSizes[100];
uniform float uOccluderAngles[50];
uniform float uOccluderRadiuses[50];

float dot2(vec2 v) {
    return dot(v, v);
}

// 2D SDF primitives

float sdTriangle( in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2 )
{
    vec2 e0 = p1-p0, e1 = p2-p1, e2 = p0-p2;
    vec2 v0 = p -p0, v1 = p -p1, v2 = p -p2;
    vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 );
    vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 );
    vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 );
    float s = sign( e0.x*e2.y - e0.y*e2.x );
    vec2 d = min(min(vec2(dot(pq0,pq0), s*(v0.x*e0.y-v0.y*e0.x)),
                     vec2(dot(pq1,pq1), s*(v1.x*e1.y-v1.y*e1.x))),
                     vec2(dot(pq2,pq2), s*(v2.x*e2.y-v2.y*e2.x)));
    return -sqrt(d.x)*sign(d.y);
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdCapsule( vec2 p, float r1, float r2, float h )
{
    p.x = abs(p.x);
    float b = (r1-r2)/h;
    float a = sqrt(1.0-b*b);
    float k = dot(p,vec2(-b,a));
    if( k < 0.0 ) return length(p) - r1;
    if( k > a*h ) return length(p-vec2(0.0,h)) - r2;
    return dot(p, vec2(a,b) ) - r1;
}

float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}

// 3-sided box SDF using union of segments
float sdSpotlight(vec2 p, vec2 size, float angle) {
    
// Rotation matrix (counterclockwise)
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle),sin(angle), cos(angle));

    // Define the corners of the box in local space (assuming bottom-left origin)
    vec2 bottomLeft = vec2(-size.x * 0.5, -size.y * 0.5);
    vec2 bottomRight = vec2(size.x * 0.5, -size.y * 0.5);
    vec2 topLeft = vec2(-size.x * 0.5, size.y * 0.5);

    
    // Rotate the corners
    vec2 newP = rotationMatrix * p;
    
    // Define the open side (top side)
    vec2 topRight = vec2(size.x * 0.5, size.y * 0.5);

    // Compute the distances to the three segments: left, right, and top
    float leftDist = sdSegment(newP, bottomLeft, topLeft);   // Left side segment
    float rightDist = sdSegment(newP, bottomRight, topRight); // Right side segment
    float topDist = sdSegment(newP, topLeft, topRight);

    // Combine the distances using the union (minimum) operation
    return min(min(leftDist, rightDist), topDist);
}

// 4-sided "Empty" Box SDF using union of segments
float sdEmptyBox(vec2 p, vec2 size) {
    // Define the corners of the box in local space (assuming bottom-left origin)
    vec2 bottomLeft = vec2(-size.x * 0.5, -size.y * 0.5);
    vec2 bottomRight = vec2(size.x * 0.5, -size.y * 0.5);
    vec2 topLeft = vec2(-size.x * 0.5, size.y * 0.5);
    vec2 topRight = vec2(size.x * 0.5, size.y * 0.5);

    // Compute the distances to all four sides: left, right, bottom, and top
    float leftDist = sdSegment(p, bottomLeft, topLeft);    // Left side segment
    float rightDist = sdSegment(p, bottomRight, topRight);  // Right side segment
    float bottomDist = sdSegment(p, bottomLeft, bottomRight); // Bottom side segment
    float topDist = sdSegment(p, topLeft, topRight);         // Top side segment

    // Combine the distances using the union (minimum) operation
    return min(min(min(leftDist, rightDist), bottomDist), topDist);
}

float sdTrapezoid( in vec2 p, in float r1, float r2, float he )
{
    vec2 k1 = vec2(r2,he);
    vec2 k2 = vec2(r2-r1,2.0*he);
    p.x = abs(p.x);
    vec2 ca = vec2(p.x-min(p.x,(p.y<0.0)?r1:r2), abs(p.y)-he);
    vec2 cb = p - k1 + k2*clamp( dot(k1-p,k2)/dot2(k2), 0.0, 1.0 );
    float s = (cb.x<0.0 && ca.y<0.0) ? -1.0 : 1.0;
    return s*sqrt( min(dot2(ca),dot2(cb)) );
}



float sdEllipse( in vec2 p, in vec2 ab )
{
    p = abs(p); if( p.x > p.y ) {p=p.yx;ab=ab.yx;}
    float l = ab.y*ab.y - ab.x*ab.x;
    float m = ab.x*p.x/l;      float m2 = m*m; 
    float n = ab.y*p.y/l;      float n2 = n*n; 
    float c = (m2+n2-1.0)/3.0; float c3 = c*c*c;
    float q = c3 + m2*n2*2.0;
    float d = c3 + m2*n2;
    float g = m + m*n2;
    float co;
    if( d<0.0 )
    {
        float h = acos(q/c3)/3.0;
        float s = cos(h);
        float t = sin(h)*sqrt(3.0);
        float rx = sqrt( -c*(s + t + 2.0) + m2 );
        float ry = sqrt( -c*(s - t + 2.0) + m2 );
        co = (ry+sign(l)*rx+abs(g)/(rx*ry)- m)/2.0;
    }
    else
    {
        float h = 2.0*m*n*sqrt( d );
        float s = sign(q+h)*pow(abs(q+h), 1.0/3.0);
        float u = sign(q-h)*pow(abs(q-h), 1.0/3.0);
        float rx = -s - u - c*4.0 + 2.0*m2;
        float ry = (s - u)*sqrt(3.0);
        float rm = sqrt( rx*rx + ry*ry );
        co = (ry/sqrt(rm-rx)+2.0*g/rm-m)/2.0;
    }
    vec2 r = ab * vec2(co, sqrt(1.0-co*co));
    return length(r-p) * sign(p.y-r.y);
}

// Structure to represent an occluder
struct Occluder {
    vec2 position;
    vec2 size;
    float rotation;
    float radius;
    int shape;
};

// Structure to represent a PointLight
struct PointLight {
    vec2 position;
    float intensity;
    float falloff;
    vec3 color;
};

// Structure to represent an AmbientLight
struct AmbientLight {
    vec3 color;
    float intensity;
    vec2 position;
};

// Helper function for rotation
mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

mat3 transform2D(vec2 pos, float angle, vec2 scale) {
    // Build a 3x3 transformation matrix for 2D homogeneous coordinates
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        scale.x * c, -scale.y * s, pos.x,
        scale.x * s,  scale.y * c, pos.y,
        0.0, 0.0, 1.0
    );
}

float calculateShadow(vec2 point, vec2 lightPos, Occluder occluder) {

    vec2 lightToPoint = point - lightPos;
    float rayLength = length(lightToPoint);
    vec2 rayDir = normalize(lightToPoint);
    float rollOff = uOcclusionRolloff;
    int shape = occluder.shape;
    float shadow = 1.0;
    float stepSize = 1.0;        
    vec2 currentPos = lightPos;
    float distanceTraveled = 0.0;
    bool hitOccluder = false;
    
    // Continue marching until we reach the end point
    while(distanceTraveled < rayLength) {

        vec2 relativePos = currentPos - occluder.position;
        vec2 rotatedRelativePos = rotate2D(occluder.rotation) * relativePos; 
        vec2 normalizedPos = rotatedRelativePos / occluder.size;
        vec2 flippedUv = vec2(normalizedPos.x, 1.0 - normalizedPos.y);
        float distanceToSDF = 0.0;

        //get distance to SDF
        if (shape == 0) {
            distanceToSDF = sdCircle(relativePos, occluder.radius);
        } else if (shape == 1) {
            distanceToSDF = sdBox(relativePos, occluder.size);
        } else if (shape == 2) {
            //capsule
            distanceToSDF = sdCapsule(relativePos, occluder.radius, occluder.radius, occluder.size.y);
        } else if (shape == 3) {
            distanceToSDF = sdEllipse(relativePos, occluder.size);
        } else if (shape == 4) {
            //spotlight
            distanceToSDF = sdSpotlight(relativePos, occluder.size, occluder.rotation);
        } else if (shape == 5) {
            //line segment
            distanceToSDF = sdSegment(relativePos, vec2(0.0, 0.0), vec2(occluder.size.x, -occluder.size.y));
        } else if (shape == 6) {
            //trapezoid
            distanceToSDF = sdTrapezoid(relativePos, occluder.size.x, occluder.radius, occluder.size.y);
        } else if (shape == 7) {
            //EmptyBox
            distanceToSDF = sdEmptyBox(relativePos, occluder.size);
        }        

        if(hitOccluder == false) {

            //quick test for fast bail
            if (distanceToSDF > rayLength) {
               
                shadow = 1.0;
                break;
            }

            if(distanceToSDF <= 1.0 ) {
                
                hitOccluder = true;
                // If we hit an occluder, cast shadow along the remaining ray
                shadow *= 0.0;
                if (shadow <= 0.0) {
                    shadow = 0.0;
                }
            }else{
                stepSize = distanceToSDF;
            }

        } else {
              shadow = 0.0;
                if (shadow <= 0.0) {
                    shadow = 0.0;
                }
        }
                
        // March forward along the ray
        currentPos += rayDir * (stepSize * 0.9);
        distanceTraveled = length(currentPos - lightPos);
    }
    
    return shadow;
}

vec2 convertFlat2Vec2(float[100] list, int index ){
    return vec2(float(list[index * 2]), float(list[index * 2 + 1]));
}

vec3 convertFlat2Vec3(float[150] list, int index){
    return vec3(float(list[index * 3]), float(list[index * 3 + 1]), float(list[index * 3 + 2]));
}


void main() {
    vec2 pixelCoord = v_uv * u_resolution;
    vec3 totalLight = vec3(0.0);
    
    // Process point lights
    for(int i = 0; i < uPointLightCount; i++) {
        PointLight light;
        light.position = convertFlat2Vec2(uPointLightPositions, i);
        light.intensity = uPointLightIntensities[i];
        light.falloff = uPointLightFalloffs[i];
        light.color = convertFlat2Vec3(uPointLightColors, i);
        
        float  combinedShadow = 1.0;
        // Calculate shadows from all occluders for this light
        for(int j = 0; j < uOccluderCount; j++) {

            Occluder occluder;
            occluder.position = convertFlat2Vec2(uOccluderPositions, j);
            occluder.size = convertFlat2Vec2(uOccluderSizes, j);
            occluder.rotation = -uOccluderAngles[j];  // invert radian angle to match Excalibur rotation to GLSL rotation
            occluder.radius = uOccluderRadiuses[j];
            occluder.shape = uOccluderShapes[j];

            float shadow = calculateShadow(pixelCoord, light.position, occluder);
            combinedShadow *= shadow; // Multiply shadows together for overlapping occluders
        }
        
        // Calculate point light contribution
        float distance = length(pixelCoord - light.position);
        float falloff = 1.0 / (1.0 + distance * light.falloff);
        vec3 pointLightContribution = light.color * falloff * combinedShadow * light.intensity;
        totalLight += pointLightContribution;
    }

    // Process ambient lights
    for(int i = 0; i < uAmbientLightCount; i++) {
        AmbientLight ambient;
        ambient.position = convertFlat2Vec2(uAmbientLightPositions, i);
        ambient.color = convertFlat2Vec3(uAmbientLightColors, i);
        ambient.intensity = uAmbientLightIntensities[i];
        // Simple ambient contribution - could be modified to have falloff or other effects
        totalLight += ambient.color * ambient.intensity;
    }
           
    vec4 textureColor = texture(u_image, v_uv);
    
    // Final color calculation
    vec3 finalColor = min(totalLight * textureColor.rgb, vec3(1.0));
    fragColor = vec4(finalColor, textureColor.a);  
  
}`;
