'use client'

import { useRef, useEffect } from 'react'

import Image from 'next/image'

import { getLayer } from '@/lib/chat/tools/fetchGeoData/layer'
import { LayerId } from '@/lib/chat/tools/fetchGeoData/solar'
import { DropdownMenuItem, DropdownMenu, DropdownMenuContent, DropdownMenuGroup } from '@/components/ui/dropdown-menu'

interface MapDataCanvasProps {
    data: any
    month?: number
    day?: number
    layerIds: LayerId[]
}

export async function MapDataCanvas({ data, month = 6, day = 29, layerIds = ['annualFlux', 'rgb'] }: MapDataCanvasProps) {

    // Canvas reference
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Create imgRef reference
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {

        console.log(data)
        const renderLayer = async (layerId: LayerId) => {
            try {
                const layer = await getLayer(canvasRef.current!, layerId, data[layerId]);
                const playAnimation = ['monthlyFlux', 'hourlyShade'].includes(layerId);
                let showRoofOnly = ['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId);
                // TODO: Need to feed in months to update hourly map
                let overlays: any[] = [];
                const bounds = layer.bounds;
                console.log('Render layer:', {
                    layerId: layer.id,
                    data: data[layerId],
                    showRoofOnly: showRoofOnly,
                    month: month,
                    day: day,
                });
                overlays.map((overlay) => overlay.setMap(null));
                overlays = layer
                    .render(showRoofOnly)
                    // @ts-ignore
                    .map((canvas: any) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));
            } catch (error) {
                console.error(error)
            }
        }
        layerIds.map(renderLayer)

        const canvas = canvasRef.current

        if (canvas === null)
            return

        const context = canvas.getContext('2d')

        if (context === null)
            return

        const image = imgRef.current

        if (image === null)
            return

        context.drawImage(image, 0, 0)
    }, [canvasRef, imgRef, data, month, day, layerIds])

    return <>
        <div className='relative'>
            {layerIds.map((layerId) => {
                return <DataLayer key={layerId} layerId={layerId} showRoofOnly={['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId)} data={data[layerId]} month={month} day={day} />
            })
            }
        </div>
        <DropdownMenu>
            <DropdownMenuContent>
                <DropdownMenuGroup>
                    <DropdownMenuItem key="mask">Mask</DropdownMenuItem>
                    <DropdownMenuItem key="dsm">DSM</DropdownMenuItem>
                    <DropdownMenuItem key="rgb">RGB</DropdownMenuItem>
                    <DropdownMenuItem key="annualFlux">Annual Flux</DropdownMenuItem>
                    <DropdownMenuItem key="monthlyFlux">Monthly Flux</DropdownMenuItem>
                    <DropdownMenuItem key="hourlyShade">Hourly Shade</DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    </>
}

async function DataLayer({ layerId, data, showRoofOnly = false, month = 6, day = 29 }) {
    // Canvas reference
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Create imgRef reference
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        const renderLayer = async (layerId: LayerId) => {
            try {
                const layer = await getLayer(canvasRef.current!, layerId, data);
                // TODO: Need to feed in months to update hourly map
                let overlays: any[] = [];
                const bounds = layer.bounds;
                console.log('Render layer:', {
                    layerId: layer.id,
                    data: data,
                    showRoofOnly: showRoofOnly,
                    month: month,
                    day: day,
                });
                overlays.map((overlay) => overlay.setMap(null));
                overlays = layer
                    .render(showRoofOnly)
                    // @ts-ignore
                    .map((canvas: any) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));
            } catch (error) {
                console.error(error)
            }
        }
        renderLayer(layerId)

        const canvas = canvasRef.current

        if (canvas === null)
            return

        const context = canvas.getContext('2d')

        if (context === null)
            return

        const image = imgRef.current

        if (image === null)
            return

        context.drawImage(image, 0, 0)
    }, [canvasRef, imgRef, data, month, day, layerId])

    return <div className='absolute top-0 left-0'>
        <canvas
            ref={canvasRef}
            style={{
                border: 'solid 1px black',
            }}
        ></canvas>
        <Image
            ref={imgRef}
            src={'/blank.png'}
            width={100}
            height={100}
            alt=""
            priority={true}
            style={{
                display: 'none',
            }}
        /></div>
}

