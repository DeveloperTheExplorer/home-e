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
      const data = await fetchBuildingInsights(lat, lng)
      //curl -X GET "https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=37.4450&location.longitude=-122.1390&requiredQuality=HIGH&key=YOUR_API_KEY"
      return data
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        throw error;
    }
}
export async function fetchBuildingInsights(lat: number, lng: number) {
    try {
      const params = new URLSearchParams()
      params.append('key', process.env.GOOGLE_API_KEY || '')
      params.append('location.latitude', lat.toString())
      params.append('location.longitude', lng.toString())
      params.append('requiredQuality', 'HIGH')
      const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params.toString()}`;

      const response = await fetch(
        url,
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

      const data = await response.json()
      console.log('Response data:', data)
      return data
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        throw error;
    }
}