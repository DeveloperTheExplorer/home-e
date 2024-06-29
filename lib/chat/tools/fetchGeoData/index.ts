import * as geotiff from 'geotiff'
import * as geokeysToProj4 from 'geotiff-geokeys-to-proj4'
import proj4 from 'proj4'

export interface Bounds {
  north: number
  south: number
  east: number
  west: number
}
export interface GeoTiff {
  width: number
  height: number
  rasters: Array<number>[]
  bounds: Bounds
}

export async function fetchCoordinates(address: string) {
  try {
    const params = new URLSearchParams()
    params.append('key', process.env.GOOGLE_API_KEY || '')
    params.append('address', address)

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const { results } = await response.json()
    console.log('Response data:', results)
    if (!results.length) {
      throw new Error('No results found')
    }
    const { lat, lng } = results[0].geometry.location
    const geoData = await fetchBuildingInsights(lat, lng)
    const dataLayers = await fetchGeoDataLayers(lat, lng)
    return {
      dataLayers,
      geoData
    }
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error)
    throw error
  }
}

export async function fetchBuildingInsights(lat: number, lng: number) {
  try {
    const params = new URLSearchParams()
    params.append('key', process.env.GOOGLE_API_KEY || '')
    params.append('location.latitude', lat.toString())
    params.append('location.longitude', lng.toString())
    params.append('requiredQuality', 'HIGH')
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Response data:', data)

    return data
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error)
    throw error
  }
}

export async function fetchGeoDataLayers(
  lat: number,
  lng: number,
  radius: number = 150
) {
  try {
    const params = new URLSearchParams()
    params.append('key', process.env.GOOGLE_API_KEY || '')
    params.append('location.latitude', lat.toString())
    params.append('location.longitude', lng.toString())
    params.append('radiusMeters', radius.toString())
    params.append('view', 'FULL_LAYERS')
    params.append('requiredQuality', 'HIGH')
    params.append('exactQualityRequired', 'true')
    params.append('pixelSizeMeters', '0.5')
    const url = `https://solar.googleapis.com/v1/dataLayers:get?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Response data:', data)

    return data
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error)
    throw error
  }
}
export async function downloadGeoTIFF(url: string): Promise<GeoTiff> {
  const API_KEY = process.env.GOOGLE_API_KEY

  const solarUrl = url.includes('solar.googleapis.com')
    ? url + `&key=${API_KEY}`
    : url
  console.log('Downloading GeoTIFF:', solarUrl)
  const response = await fetch(solarUrl)
  if (response.status != 200) {
    const error = await response.json()
    console.error(`downloadGeoTIFF failed: ${url}\n`, error)
    throw error
  }

  // Get the GeoTIFF rasters, which are the pixel values for each band.
  const arrayBuffer = await response.arrayBuffer()
  const tiff = await geotiff.fromArrayBuffer(arrayBuffer)
  const image = await tiff.getImage()
  const rasters = await image.readRasters()

  // Reproject the bounding box into lat/lon coordinates.
  const geoKeys = image.getGeoKeys()
  const projObj = geokeysToProj4.toProj4(geoKeys)
  const projection = proj4(projObj.proj4, 'WGS84')
  const box = image.getBoundingBox()
  const sw = projection.forward({
    x: box[0] * projObj.coordinatesConversionParameters.x,
    y: box[1] * projObj.coordinatesConversionParameters.y
  })
  const ne = projection.forward({
    x: box[2] * projObj.coordinatesConversionParameters.x,
    y: box[3] * projObj.coordinatesConversionParameters.y
  })

  return {
    // Width and height of the data layer image in pixels.
    // Used to know the row and column since Javascript
    // stores the values as flat arrays.
    width: rasters.width,
    height: rasters.height,
    // Each raster reprents the pixel values of each band.
    // We convert them from `geotiff.TypedArray`s into plain
    // Javascript arrays to make them easier to process.
    // @ts-ignore
    rasters: [...Array(rasters.length).keys()].map(i =>
      Array.from(rasters[i] as geotiff.TypedArray)
    ),
    // The bounding box as a lat/lon rectangle.
    bounds: {
      north: ne.y,
      south: sw.y,
      east: ne.x,
      west: sw.x
    }
  }
}
// export async function downloadDataLayers(layer: DataLayersResponse) {

// }
