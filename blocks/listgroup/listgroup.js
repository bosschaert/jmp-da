/* eslint no-undef: 0 */

import { loadScript } from '../../scripts/aem.js';
import {
  getBlockPropertiesList,
  getBlockProperty,
  getJsonFromUrl,
  getListFilterOptions,
  languageIndexExists,
  pageAndFilter,
  pageFilterByFolder,
  pageOrFilter,
} from '../../scripts/jmp.js';

export function createDateFromString(date) {
  const dateTimeValue = moment(date, 'YYYY-MM-DD').format();
  return dateTimeValue;
}

export default async function decorate(block) {
  await loadScript('/scripts/moment/moment.js');

  // Get Index based on language directory of current page.
  const pageLanguage = window.location.pathname.split('/')[1];
  let url = '/jmp-all.json';
  if (languageIndexExists(pageLanguage)) {
    url = `/jmp-${pageLanguage}.json`;
  }
  const { data: allPages, columns: propertyNames } = await getJsonFromUrl(url);
  let pageSelection = allPages;

  const optionsObject = getBlockPropertiesList(block, 'options');
  const startingFolder = getBlockProperty(block, 'startingFolder');
  const emptyResultsMessage = getBlockProperty(block, 'emptyResultsMessage');
  const filterOptions = getListFilterOptions(block, propertyNames);

  // If startingFolder is not null, then apply page location filter FIRST.
  if (startingFolder !== undefined) {
    pageSelection = pageFilterByFolder(pageSelection, startingFolder);
  }

  // Filter pages
  if (optionsObject.filterType !== undefined && optionsObject.filterType.toLowerCase() === 'and') {
    pageSelection = pageAndFilter(pageSelection, filterOptions);
  } else {
    pageSelection = pageOrFilter(pageSelection, filterOptions);
  }

  // Order filtered pages by releaseDate
  pageSelection.sort((a, b) => (moment(createDateFromString(a.releaseDate))
    .isBefore(createDateFromString(b.releaseDate)) ? -1 : 1));

  // Cut results down to fit within specified limit.
  const limitObjects = optionsObject.limit;
  if (limitObjects !== undefined && pageSelection.length > limitObjects) {
    pageSelection = pageSelection.slice(0, limitObjects);
  }

  const wrapper = document.createElement('ul');
  const columns = optionsObject.columns !== undefined ? optionsObject.columns : 5;
  wrapper.classList = `listOfItems image-list list-tile col-size-${columns}`;

  pageSelection.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.classList = `${item.resourceOptions}`;
    const cardLink = document.createElement('a');
    if (item.redirectUrl.length > 0) {
      cardLink.href = item.redirectUrl;
      cardLink.target = '_blank';
    } else {
      cardLink.href = item.path;
      cardLink.target = '_self';
    }

    let htmlOutput = `
    <span class="navigation-title">${item.resourceType}</span>
    <span class="title">${item.title}</span>`;
    if (optionsObject.images === undefined || optionsObject.images.toLowerCase() !== 'off') {
      htmlOutput += `<span class="cmp-image image"><img src="${item.image}"/></span>`;
    }
    htmlOutput += `<span class="abstract">${item.description}</span>`;
    cardLink.innerHTML = htmlOutput;

    listItem.append(cardLink);
    wrapper.append(listItem);
  });

  if (pageSelection.length === 0 && emptyResultsMessage !== undefined) {
    const emptyResultsDiv = document.createElement('div');
    emptyResultsDiv.classList = 'no-results';
    emptyResultsDiv.innerHTML = `<span>${emptyResultsMessage}</span>`;
    wrapper.append(emptyResultsDiv);
  }

  block.append(wrapper);
}
