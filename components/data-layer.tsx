'use client'

import { useRef, useEffect, useState, use } from 'react'

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
    // const canvasRef = useRef<HTMLCanvasElement>(null)

    // // Create imgRef reference
    // const imgRef = useRef<HTMLImageElement>(null)

    // useEffect(() => {

    //     console.log(data)
    //     const renderLayer = async (layerId: LayerId) => {
    //         try {
    //             const layer = await getLayer(canvasRef.current!, layerId, data[layerId]);
    //             const playAnimation = ['monthlyFlux', 'hourlyShade'].includes(layerId);
    //             let showRoofOnly = ['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId);
    //             // TODO: Need to feed in months to update hourly map
    //             let overlays: any[] = [];
    //             const bounds = layer.bounds;
    //             console.log('Render layer:', {
    //                 layerId: layer.id,
    //                 data: data[layerId],
    //                 showRoofOnly: showRoofOnly,
    //                 month: month,
    //                 day: day,
    //             });
    //             overlays.map((overlay) => overlay.setMap(null));
    //             overlays = layer
    //                 .render(showRoofOnly)
    //                 // @ts-ignore
    //                 .map((canvas: any) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));
    //         } catch (error) {
    //             console.error(error)
    //         }
    //     }
    //     layerIds.map(renderLayer)

    //     const canvas = canvasRef.current

    //     if (canvas === null)
    //         return

    //     const context = canvas.getContext('2d')

    //     if (context === null)
    //         return

    //     const image = imgRef.current

    //     if (image === null)
    //         return

    //     context.drawImage(image, 0, 0)
    // }, [canvasRef, imgRef, data, month, day, layerIds])

    return <>
        <div className='relative'>
            {layerIds.map((layerId) =>
                <DataLayer key={layerId} layerId={layerId} showRoofOnly={['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId)} data={data[layerId]} month={month} day={day} />
            )}
            {/* {layerIds.map((layerId) => {
                return layerId !== 'hourlyShade' ?
                    <DataLayer key={layerId} layerId={layerId} showRoofOnly={['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId)} data={data[layerId]} month={month} day={day} /> :
                    <HourlyLayer data={data['hourlyShade']} showRoofOnly={false} day={day} />
            })
            } */}

        </div>
        {/* <DropdownMenu>
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
        </DropdownMenu> */}
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
    }, [canvasRef, imgRef, data, month, day, layerId, showRoofOnly])

    return <div className='absolute top-0 left-0 pb-80'>
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

async function HourlyLayer({ data, showRoofOnly = false, month = 6, day = 29 }) {
    const [hour, setHour] = useState(0);

    // Canvas reference
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Create imgRef reference
    const [images, setImages] = useState<HTMLImageElement[]>([])
    const imgRef = useRef<HTMLImageElement>(null)
    const imageReferences = useRef<HTMLImageElement[]>([])

    const layerId = 'hourlyShade'

    useEffect(() => {
        const interval = setInterval(() => hour > 20 ? setHour(0) : setHour(hour + 1), 2_500);
        console.log('Hour:', hour, hour + 1 % 11);
        // setImg(images[hour])
        // @ts-ignore
        imgRef.current = images[hour]
        return () => clearInterval(interval);
    }, [hour, images]);

    useEffect(() => {
        const renderLayer = async (index: number) => {
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
                    .render(showRoofOnly, month, day, index)
                    // @ts-ignore
                    .map((canvas: any) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));
            } catch (error) {
                console.error(error)
            }
        }
        renderLayer(hour)
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
    }, [data, day, hour, month, showRoofOnly]);

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