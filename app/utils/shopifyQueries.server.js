function moneyToDisplay(shopMoney) {
  if (!shopMoney?.amount) {
    return "";
  }

  return `${shopMoney.amount} ${shopMoney.currencyCode || ""}`.trim();
}

async function parseGraphqlResponse(response) {
  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data;
}

export async function getOrderDetails(admin, orderGid) {
  // Shopify's current Admin GraphQL API exposes B2B order/company data through
  // `purchasingEntity`. Older examples sometimes referenced direct company fields
  // on orders, but this implementation follows the current B2B shape defensively.
  const response = await admin.graphql(
    `#graphql
      query GetOrderDetails($id: ID!) {
        order(id: $id) {
          id
          name
          legacyResourceId
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            id
            displayName
            email
          }
          purchasingEntity {
            __typename
            ... on PurchasingCompany {
              company {
                id
                name
              }
              location {
                id
                name
              }
            }
          }
          lineItems(first: 20) {
            nodes {
              name
              quantity
              sku
              originalTotalSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `,
    { variables: { id: orderGid } },
  );

  const data = await parseGraphqlResponse(response);
  const order = data.order;

  if (!order) {
    return null;
  }

  const purchasingCompany =
    order.purchasingEntity?.__typename === "PurchasingCompany"
      ? order.purchasingEntity
      : null;

  const company = purchasingCompany?.company || null;
  const location = purchasingCompany?.location || null;

  return {
    id: order.id,
    legacyResourceId: order.legacyResourceId,
    name: order.name,
    totalPrice: moneyToDisplay(order.totalPriceSet?.shopMoney),
    customerName:
      order.customer?.displayName || order.customer?.email || "Unknown customer",
    customerEmail: order.customer?.email || "",
    companyId: company?.id || null,
    companyName: company?.name || null,
    companyLocationId: location?.id || null,
    companyLocationName: location?.name || null,
    lineItems: order.lineItems?.nodes?.map((lineItem) => ({
      name: lineItem.name,
      quantity: lineItem.quantity,
      sku: lineItem.sku,
      originalTotal: moneyToDisplay(lineItem.originalTotalSet?.shopMoney),
    })) || [],
  };
}

export async function getCompaniesWithLocations(admin) {
  const allCompanies = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.graphql(
      `#graphql
        query GetCompaniesWithLocations($cursor: String) {
          companies(first: 250, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              name
              locations(first: 50) {
                nodes {
                  id
                  name
                }
              }
            }
          }
        }
      `,
      { variables: { cursor } },
    );

    const payload = await response.json();

    if (payload.errors?.length) {
      const message = payload.errors.map((e) => e.message).join("; ");
      throw new Error(`Shopify companies query failed: ${message}`);
    }

    const companiesData = payload.data?.companies;
    const nodes = companiesData?.nodes || [];

    for (const company of nodes) {
      allCompanies.push({
        id: company.id,
        name: company.name,
        locations: (company.locations?.nodes || []).map((loc) => ({
          id: loc.id,
          name: loc.name,
        })),
      });
    }

    hasNextPage = companiesData?.pageInfo?.hasNextPage ?? false;
    cursor = companiesData?.pageInfo?.endCursor ?? null;
  }

  return allCompanies;
}

export async function getCompanyLocationAssignedStaff(admin, companyLocationGid) {
  if (!companyLocationGid) {
    return [];
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query GetCompanyLocationAssignedStaff($id: ID!) {
          companyLocation(id: $id) {
            id
            name
            staffMemberAssignments(first: 20) {
              nodes {
                id
                staffMember {
                  id
                  email
                  firstName
                  lastName
                  name
                }
              }
            }
          }
        }
      `,
      { variables: { id: companyLocationGid } },
    );

    const payload = await response.json();

    if (payload.errors?.length) {
      return [];
    }

    const assignments =
      payload.data?.companyLocation?.staffMemberAssignments?.nodes || [];

    return assignments
      .map((assignment) => assignment.staffMember?.email?.trim())
      .filter(Boolean);
  } catch (error) {
    // B2B company/staff access can fail when the store is not Plus or the app
    // lacks `read_companies` or `read_users`. Falling back is expected behavior.
    return [];
  }
}
