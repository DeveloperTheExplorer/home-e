'use client'

import { useRef, useEffect} from 'react'

import Image from 'next/image'


import { cn } from '@/lib/utils'
import { SidebarList } from '@/components/sidebar-list'
import { buttonVariants } from '@/components/ui/button'
import { IconPlus } from '@/components/ui/icons'
import { downloadGeoTIFF } from '@/lib/chat/tools/fetchGeoData'
import { renderPalette } from '@/lib/chat/tools/fetchGeoData/visualize'

export async function MapDataCanvas({ mask, data, month = 6, day = 29, layerId = 'monthlyFlux', ironPalette = ['00000A', '91009C', 'E64616', 'FEB400', 'FFFFF6'] }) {

    // Canvas reference
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Create imgRef reference
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        (async () => {
            try {
                // const [mask, data] = await Promise.all([
                //     downloadGeoTIFF(dataLayers.maskUrl),
                //     downloadGeoTIFF(dataLayers.annualFluxUrl),
                // ]);
                const colors = ironPalette;
                const layer = {
                    id: layerId,
                    bounds: mask.bounds,
                    palette: {
                        colors: colors,
                        min: 'Shady',
                        max: 'Sunny',
                    },
                    render: (showRoofOnly: boolean) => [
                        renderPalette(canvasRef.current!, {
                            data: data,
                            mask: showRoofOnly ? mask : undefined,
                            colors: colors,
                            min: 0,
                            max: 1800,
                        }),
                    ],
                };

                let overlays: any[] = [];
                const bounds = layer.bounds;
                console.log('Render layer:', {
                    layerId: layer.id,
                    showRoofOnly: false,
                    month: month,
                    day: day,
                });
                overlays.map((overlay) => overlay.setMap(null));
                overlays = layer
                    .render(false)
                    // @ts-ignore
                    .map((canvas: any) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));
            } catch (error) {
                console.error(error)
            }
        })()

        const canvas = canvasRef.current

        if (canvas === null)
            return

        const context = canvas.getContext('2d')

        if (context === null)
            return

        // Get the `img` from reference
        const image = imgRef.current

        if (image === null)
            return

        // Draw the image to the context
        context.drawImage(image, 0, 0)
    }, [canvasRef, imgRef, mask, data, month, day, layerId, ironPalette])

    return <>
        <canvas
            ref={canvasRef}
            style={{
                border: 'solid 1px black',
            }}
        ></canvas>
        <Image
            ref={imgRef}
            src={'/blank.png'}
            // className='invisible'
            width={100}
            height={100}
            alt=""
            priority={true}
            style={{
                display: 'none',
            }}
        />
    </>
}
