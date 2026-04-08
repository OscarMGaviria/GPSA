import { ref, onUnmounted } from 'vue'
import * as THREE from 'three'
import maplibregl from 'maplibre-gl'

export const CAR_ROUTE = [
  [-75.5765, 6.2220],
  [-75.5580, 6.2100],
  [-75.5350, 6.1970],
  [-75.5100, 6.1840],
  [-75.4850, 6.1720],
  [-75.4600, 6.1650],
  [-75.4400, 6.1610],
  [-75.4275, 6.1580],
]

function lerpRoute(t) {
  const n    = CAR_ROUTE.length - 1
  const safe = ((t % 1) + 1) % 1
  const seg  = Math.min(Math.floor(safe * n), n - 1)
  const lt   = safe * n - seg
  const a    = CAR_ROUTE[seg]
  const b    = CAR_ROUTE[Math.min(seg + 1, n)]
  return [a[0] + (b[0] - a[0]) * lt, a[1] + (b[1] - a[1]) * lt]
}

function calcRouteKm(route) {
  let total = 0
  for (let i = 0; i < route.length - 1; i++) {
    const [ln1, la1] = route[i], [ln2, la2] = route[i + 1]
    const dLat = (la2 - la1) * Math.PI / 180
    const dLng = (ln2 - ln1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    total += 2 * 6371 * Math.asin(Math.sqrt(a))
  }
  return total
}

const ROUTE_KM = calcRouteKm(CAR_ROUTE)

export function useThreeDemo() {
  const kmCovered = ref(0)
  const labelLeft = ref(-999)
  const labelTop  = ref(-999)

  let carProgress   = 0
  let trailFrame    = 0
  let threeRenderer = null
  let signRenderer  = null

  onUnmounted(() => {
    threeRenderer?.dispose()
    signRenderer?.dispose()
  })

  function createPavingLayer() {
    let _camera, _scene, _map

    return {
      id: 'car-3d',
      type: 'custom',
      renderingMode: '3d',

      onAdd(map, gl) {
        _map    = map
        _camera = new THREE.Camera()
        _scene  = new THREE.Scene()

        const matY  = new THREE.MeshPhongMaterial({ color: 0xffc200 })
        const matD  = new THREE.MeshPhongMaterial({ color: 0x2d3748 })
        const matM  = new THREE.MeshPhongMaterial({ color: 0x718096 })
        const matT  = new THREE.MeshPhongMaterial({ color: 0x1a202c })
        const matX  = new THREE.MeshPhongMaterial({ color: 0x4a5568 })
        const matG  = new THREE.MeshPhongMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55 })

        const G = new THREE.Group()

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.40, 0.30, 1.05), matY)
        G.add(chassis)
        const subcar = new THREE.Mesh(new THREE.BoxGeometry(2.00, 0.12, 1.16), matD)
        subcar.position.y = -0.20
        G.add(subcar)

        const hFront = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 1.14), matD)
        hFront.position.set(1.28, 0.51, 0)
        G.add(hFront)
        const hBack = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.60, 0.82), matD)
        hBack.position.set(0.56, 0.48, 0)
        G.add(hBack)
        const hWingL = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.55), matD)
        hWingL.rotation.x = 0.50
        hWingL.position.set(0.92, 0.55, 0.36)
        G.add(hWingL)
        const hWingR = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.55), matD)
        hWingR.rotation.x = -0.50
        hWingR.position.set(0.92, 0.55, -0.36)
        G.add(hWingR)
        const hRim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 1.14), matD)
        hRim.position.set(0.92, 0.86, 0)
        G.add(hRim)

        const hood = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.88), matY)
        hood.position.set(-0.08, 0.54, 0)
        G.add(hood)
        const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.82), matD)
        hoodTop.position.set(-0.08, 0.84, 0)
        G.add(hoodTop)
        const grill = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.76), matD)
        grill.position.set(0.30, 0.56, 0)
        G.add(grill)
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.52, 8), matX)
        exhaust.position.set(-0.24, 1.09, 0.24)
        G.add(exhaust)
        const exhaustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.06, 8), matX)
        exhaustCap.position.set(-0.24, 1.36, 0.24)
        G.add(exhaustCap)

        const opBase = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.62), matY)
        opBase.position.set(-0.62, 0.46, 0)
        G.add(opBase)
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.26), matD)
        seat.position.set(-0.62, 0.60, 0)
        G.add(seat)
        const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.38), matD)
        console_.position.set(-0.42, 0.72, 0)
        G.add(console_)
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.40), matG)
        windshield.position.set(-0.37, 0.76, 0)
        G.add(windshield)
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.66), matY)
        canopy.position.set(-0.62, 1.10, 0)
        G.add(canopy)
        const pillarGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.60, 6)
        ;[[-0.34, 0.30], [-0.34, -0.30], [-0.90, 0.30], [-0.90, -0.30]].forEach(([px, pz]) => {
          const p = new THREE.Mesh(pillarGeo, matY)
          p.position.set(px, 0.82, pz)
          G.add(p)
        })

        const auger = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.52, 10), matD)
        auger.rotation.x = Math.PI / 2
        auger.position.set(-0.90, -0.08, 0)
        G.add(auger)
        for (let i = 0; i < 6; i++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.22), matM)
          blade.rotation.z = (i / 6) * Math.PI
          blade.position.set(-0.90, -0.08, -0.58 + i * 0.22)
          G.add(blade)
        }

        const screedBody = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 1.62), matM)
        screedBody.position.set(-1.26, -0.06, 0)
        G.add(screedBody)
        ;[0.88, -0.88].forEach(sz => {
          const ep = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.08), matM)
          ep.position.set(-1.24, -0.04, sz)
          G.add(ep)
        })
        ;[0.40, -0.40].forEach(az => {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.06), matM)
          arm.position.set(-0.96, -0.02, az)
          G.add(arm)
        })

        const trackGeo = new THREE.BoxGeometry(2.12, 0.18, 0.26)
        ;[0.55, -0.55].forEach(tz => {
          const tr = new THREE.Mesh(trackGeo, matT)
          tr.position.set(0, -0.27, tz)
          G.add(tr)
        })
        const spGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.28, 10)
        ;[1.04, -1.06].forEach(sx => {
          ;[0.55, -0.55].forEach(sz => {
            const sp = new THREE.Mesh(spGeo, matT)
            sp.rotation.x = Math.PI / 2
            sp.position.set(sx, -0.19, sz)
            G.add(sp)
          })
        })
        const rolGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.30, 8)
        for (let i = 0; i < 5; i++) {
          ;[0.55, -0.55].forEach(rz => {
            const rol = new THREE.Mesh(rolGeo, matT)
            rol.rotation.x = Math.PI / 2
            rol.position.set(-0.80 + i * 0.40, -0.31, rz)
            G.add(rol)
          })
        }

        const pushGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.32, 8)
        ;[0.36, -0.36].forEach(pz => {
          const push = new THREE.Mesh(pushGeo, matM)
          push.position.set(1.38, 0.06, pz)
          G.add(push)
        })
        const pushBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.80), matM)
        pushBar.position.set(1.38, 0.06, 0)
        G.add(pushBar)

        _scene.add(new THREE.AmbientLight(0xffffff, 0.48))
        const sun = new THREE.DirectionalLight(0xffffff, 1.65)
        sun.position.set(100, 160, 80)
        _scene.add(sun)
        const fill = new THREE.DirectionalLight(0xffffff, 0.32)
        fill.position.set(-80, 40, -60)
        _scene.add(fill)
        const side = new THREE.DirectionalLight(0xffffff, 0.18)
        side.position.set(0, 20, 120)
        _scene.add(side)
        _scene.add(G)

        threeRenderer = new THREE.WebGLRenderer({ canvas: _map.getCanvas(), context: gl, antialias: true })
        threeRenderer.autoClear = false
      },

      render(_gl, args) {
        carProgress = (carProgress + 0.0003) % 1
        trailFrame  = (trailFrame + 1) % 6
        if (trailFrame === 0 && carProgress > 0.001) {
          const steps  = Math.max(2, Math.floor(carProgress * 80))
          const coords = []
          for (let i = 0; i <= steps; i++) coords.push(lerpRoute((i / steps) * carProgress))
          _map.getSource('paved-trail')?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } })

          const [lngL, latL] = lerpRoute(carProgress)
          const sp        = _map.project([lngL, latL])
          const kmActual  = carProgress * ROUTE_KM
          const step      = 0.5
          const lastMark  = Math.floor(ROUTE_KM / step) * step
          const displayKm = kmActual >= lastMark ? kmActual : Math.floor(kmActual / step) * step
          kmCovered.value = +displayKm.toFixed(2)
          labelLeft.value = Math.round(sp.x)
          labelTop.value  = Math.round(sp.y)
        }

        const [lng,  lat]  = lerpRoute(carProgress)
        const [lng2, lat2] = lerpRoute(carProgress + 0.005)
        const merc  = maplibregl.MercatorCoordinate.fromLngLat([lng,  lat],  0)
        const merc2 = maplibregl.MercatorCoordinate.fromLngLat([lng2, lat2], 0)
        const scale = 300 * merc.meterInMercatorCoordinateUnits()
        const dx      = merc2.x - merc.x
        const dy      = merc.y  - merc2.y
        const heading = Math.atan2(dy, dx)
        const rotX    = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2)
        const rotHead = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), heading)
        const l = new THREE.Matrix4()
          .makeTranslation(merc.x, merc.y, merc.z)
          .scale(new THREE.Vector3(scale, -scale, scale))
          .multiply(rotX)
          .multiply(rotHead)
        const rawMatrix = args?.defaultProjectionData?.mainMatrix ?? args
        const m = new THREE.Matrix4().fromArray(rawMatrix)
        _camera.projectionMatrix = m.multiply(l)
        threeRenderer.resetState()
        threeRenderer.render(_scene, _camera)
        _map.triggerRepaint()
      },
    }
  }

  function createSignLayer() {
    let _camera, _scene, _map

    return {
      id: 'sign-3d',
      type: 'custom',
      renderingMode: '3d',

      onAdd(map, gl) {
        _map    = map
        _camera = new THREE.Camera()
        _scene  = new THREE.Scene()

        function hexShape(r) {
          const s = new THREE.Shape()
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + Math.PI / 6
            const x = r * Math.cos(a)
            const y = r * Math.sin(a)
            i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)
          }
          s.closePath()
          return s
        }

        const matPole  = new THREE.MeshPhongMaterial({ color: 0x1a202c })
        const matBorder = new THREE.MeshPhongMaterial({ color: 0x0b5640, side: THREE.DoubleSide })
        const matWhite  = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide })

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 3.8, 8), matPole)
        pole.position.y = 1.9
        _scene.add(pole)
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.12, 8), matPole)
        base.position.y = 0.06
        _scene.add(base)

        const borderGeo = new THREE.ExtrudeGeometry(hexShape(0.85), { depth: 0.07, bevelEnabled: false })
        const border    = new THREE.Mesh(borderGeo, matBorder)
        border.position.set(0, 3.55, -0.035)
        _scene.add(border)
        const bgGeo = new THREE.ExtrudeGeometry(hexShape(0.74), { depth: 0.04, bevelEnabled: false })
        const bg    = new THREE.Mesh(bgGeo, matWhite)
        bg.position.set(0, 3.55, 0.02)
        _scene.add(bg)
        const borderBack = border.clone()
        borderBack.rotation.y = Math.PI
        borderBack.position.set(0, 3.55, 0.035)
        _scene.add(borderBack)
        const bgBack = bg.clone()
        bgBack.rotation.y = Math.PI
        bgBack.position.set(0, 3.55, -0.02)
        _scene.add(bgBack)

        const hexTop = 3.55 + 0.62
        const hexBot = 3.55 - 0.62
        const hexH   = hexTop - hexBot
        const signH  = hexH * 0.55
        const signW  = signH * (350 / 140)

        const loader = new THREE.TextureLoader()
        loader.load('/A toda maquina.png', (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), mat)
          sign.position.set(0, 3.55, 0.065)
          _scene.add(sign)
          const signBack = sign.clone()
          signBack.position.z = -0.065
          signBack.rotation.y = Math.PI
          _scene.add(signBack)
        })

        _scene.add(new THREE.AmbientLight(0xffffff, 1.1))
        const sun = new THREE.DirectionalLight(0xffffff, 1.4)
        sun.position.set(80, 150, 60)
        _scene.add(sun)

        signRenderer = new THREE.WebGLRenderer({ canvas: _map.getCanvas(), context: gl, antialias: true })
        signRenderer.autoClear = false
      },

      render(_gl, args) {
        const pos   = CAR_ROUTE[0]
        const merc  = maplibregl.MercatorCoordinate.fromLngLat(pos, 0)
        const scale = 300 * merc.meterInMercatorCoordinateUnits()
        const l = new THREE.Matrix4()
          .makeTranslation(merc.x, merc.y, merc.z)
          .scale(new THREE.Vector3(scale, -scale, scale))
        const rawMatrix = args?.defaultProjectionData?.mainMatrix ?? args
        const m = new THREE.Matrix4().fromArray(rawMatrix)
        _camera.projectionMatrix = m.multiply(l)
        signRenderer.resetState()
        signRenderer.render(_scene, _camera)
        _map.triggerRepaint()
      },
    }
  }

  return { kmCovered, labelLeft, labelTop, createPavingLayer, createSignLayer }
}
