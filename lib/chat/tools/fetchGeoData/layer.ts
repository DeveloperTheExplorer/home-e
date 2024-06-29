import { Bounds, DataLayersResponse, LayerId, downloadGeoTIFF } from './solar'
import { renderPalette, renderRGB } from './visualize'

export interface Palette {
  colors: string[]
  min: string
  max: string
}

export interface Layer {
  id: LayerId
  render: (
    showRoofOnly: boolean,
    month?: number,
    day?: number,
    hour?: number,
  ) => HTMLCanvasElement[]
  bounds: Bounds
  palette?: Palette
}

export const binaryPalette = ['212121', 'B3E5FC']
export const rainbowPalette = ['3949AB', '81D4FA', '66BB6A', 'FFE082', 'E53935']
export const ironPalette = ['00000A', '91009C', 'E64616', 'FEB400', 'FFFFF6']
export const sunlightPalette = ['212121', 'FFCA28']
export const panelsPalette = ['E8EAF6', '1A237E']

export async function getLayer(
  canvas: HTMLCanvasElement,
  layerId: LayerId,
  inputs: any
  //   urls: DataLayersResponse,
): Promise<Layer> {
  const get: Record<LayerId, () => Promise<Layer>> = {
    mask: async () => {
      //   const mask = await downloadGeoTIFF(urls.maskUrl)
      const mask = inputs
      const colors = binaryPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'No roof',
          max: 'Roof'
        },
        render: showRoofOnly => [
          renderPalette(canvas, {
            data: mask,
            mask: showRoofOnly ? mask : undefined,
            colors: colors
          })
        ]
      }
    },
    dsm: async () => {
      const [mask, data] = inputs
      const sortedValues = Array.from(data.rasters[0]).sort((x, y) => x - y)
      const minValue = sortedValues[0]
      const maxValue = sortedValues.slice(-1)[0]
      const colors = rainbowPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: `${minValue.toFixed(1)} m`,
          max: `${maxValue.toFixed(1)} m`
        },
        render: showRoofOnly => [
          renderPalette(canvas, {
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colors,
            min: sortedValues[0],
            max: sortedValues.slice(-1)[0]
          })
        ]
      }
    },
    rgb: async () => {
      const [mask, data] = inputs
      console.log('RGB data: ', mask, data)
      return {
        id: layerId,
        bounds: mask.bounds,
        render: showRoofOnly => [
          renderRGB(canvas, data, showRoofOnly ? mask : undefined)
        ]
      }
    },
    annualFlux: async () => {
      const [mask, data] = inputs
      const colors = ironPalette
      console.log('Annual flux data: ', mask, data)
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'Shady',
          max: 'Sunny'
        },
        render: showRoofOnly => [
          renderPalette(canvas, {
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colors,
            min: 0,
            max: 1800
          })
        ]
      }
    },
    monthlyFlux: async () => {
      const [mask, data] = inputs
      const colors = ironPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'Shady',
          max: 'Sunny'
        },
        render: showRoofOnly =>
          // @ts-ignore
          [...Array(12).keys()].map(month =>
            renderPalette(canvas, {
              data: data,
              mask: showRoofOnly ? mask : undefined,
              colors: colors,
              min: 0,
              max: 200,
              index: month
            })
          )
      }
    },
    hourlyShade: async () => {
      const [mask, ...months] = inputs
      const colors = sunlightPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'Shade',
          max: 'Sun'
        },
        render: (showRoofOnly, month, day, hour) => {
          // @ts-ignore
          //   [...Array(24).keys()].map(hour =>
          console.log('Hourly shade data: ', [months[hour ?? 0 + 1]], hour)
          return [
            renderPalette(canvas, {
              data: [months[hour ?? 0 + 1]],
              // ...months[month ?? 6],
              // rasters: months[month ?? 6].rasters.map(values =>
              //   values.map(x => x & (1 << (day ?? 29 - 1)))
              // )
              //   },
              mask: showRoofOnly ? mask : undefined,
              colors: colors,
              min: 0,
              max: 1
              //   index: hour
            })
          ]
        }
        //   )
      }
    }
  }
  try {
    return get[layerId]()
  } catch (e) {
    console.error(`Error getting layer: ${layerId}\n`, e)
    throw e
  }
}
