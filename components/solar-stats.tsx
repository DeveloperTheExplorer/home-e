'use client'

import { useRef, useEffect } from 'react'

import Image from 'next/image'

import { getLayer } from '@/lib/chat/tools/fetchGeoData/layer'
import { LayerId } from '@/lib/chat/tools/fetchGeoData/solar'
import { DropdownMenuItem, DropdownMenu, DropdownMenuContent, DropdownMenuGroup } from '@/components/ui/dropdown-menu'

export interface MapDataCanvasProps {
    solarData: {
        maxSunshineHoursPerYear: number;
        maxArrayAreaMeters2: number;
    };
    panelData: {
        panelsCount: number;
        panelCapacityWatts: number;
    };
}

export async function SolarStats(props: MapDataCanvasProps) {

    console.log(props)
    return <div className='w-full'>
        <h1 className='underline text-xl'>Solar Potential</h1>
        <table className="table-auto  w-full text-lg">
            <tbody>
                <tr>
                    <td>Potential Sunshine Hours Per Year</td>
                    <td>{props.solarData.maxSunshineHoursPerYear.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Usable Solar Area</td>
                    <td>{props.solarData.maxArrayAreaMeters2.toFixed(2)}m²</td>
                </tr>
            </tbody>
        </table>
        <h1 className='underline text-xl'>Panel Stats</h1>
        <table className="table-auto  w-full text-lg">
            <tbody>
                <tr>
                    <td>Panel Count</td>
                    <td>{props.panelData.panelsCount}</td>
                </tr>
                <tr>
                    <td>Panel Capacity</td>
                    <td>{props.panelData.panelCapacityWatts}W</td>
                </tr>
            </tbody>
        </table>
    </div>

    // <div>
    //     <h1>Solar Stats</h1>
    //     <h2>Max Sunshine Hours Per Year: {props.solarData.maxSunshineHoursPerYear}</h2>
    //     <h2>Max Array Area Meters Squared: {props.solarData.maxArrayAreaMeters2}</h2>
    //     <h2>Panel Count: {props.panelData.panelsCount}</h2>
    //     <h2>Panel Capacity Watts: {props.panelData.panelCapacityWatts}</h2>
    // </div>
}
