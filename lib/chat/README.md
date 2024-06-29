curl https://api.eli.build/incentives \
  -X POST \
  -H "Content-Type: application/json" \
  -H 'Authorization: Bearer ' \
  -d '{
        "address": {
          "line1": "123 Main St.",
          "city": "Denver",
          "state": "CO",
          "zipcode": "80012"
        },
        "household_income": 3050000,
        "household_size": 3,
        "tax_filing_status": "joint",
        "property_type": "single_family",
        "upgrade_measures": [
          {
            "measure": "hp_laundry_dryer",
            "estimated_min_cost": 50000
          }
        ],
        "metadata": {
          "external_id": "123"
        }
      }'