window.addEventListener("pageshow", () => {
    function processElement(element) {
        // Add tag field badges
        const tagFields = Array.from(element.querySelectorAll(".tags"));
        tagFields.forEach(updateTagFieldCountBadge);

        // Add related item count badges and copy buttons
        const relatedItemGroups = getRelatedItemGroups(element);
        relatedItemGroups.forEach(updateRelatedItemGroup);

        const sidebar = element.querySelector('.sidebar');
        if (sidebar) {
            addSuperstringSidebarSection(sidebar);
        }

        const flexContainer = element.querySelector('.flex-container');
        if (flexContainer) {
            addSuperstringOrganizationSection(flexContainer);
        }

        // Format phone numbers
        const dtList = [...element.querySelectorAll('dt')];
        dtList
            .filter(isPhoneHeader)
            .map(nextElementSibling)
            .map(parsePhoneElement)
            .filter(isNotNull)
            .forEach(createPhoneLink);

        // Add "New" links to tag fields on FA edit pages
        var tagInputs = element.getElementsByClassName("form-tag tt-input");
        for (let i = 0; i < tagInputs.length; i++) {
            let tagType = tagInputs[i].getAttribute("data-kind");
            let organizationId = tagInputs[i].getAttribute("data-organization");

            // Create "Add new" link
            let link = document.createElement("a");
            let text = document.createTextNode("Add new");
            link.appendChild(text);
            link.classList.add("epoxy-tag-new-link");
            link.target = "_blank";
            let baseUrl = window.location.origin + "/";
            let organizationUrl = baseUrl + organizationId + "/";
            let parent = tagInputs[i].parentNode;

            switch (tagType) {
                // Organization-specific core assets
                case "checklists":
                case "configurations":
                case "contacts":
                case "documents":
                case "domains":
                case "locations":
                case "passwords":
                case "ssl_certificates":
                    link.href = organizationUrl + tagType + "/new";
                    parent.parentNode.insertBefore(link, parent);
                    break;
                    // Global core assets
                case "accounts_users":
                    link.href = baseUrl + "users/new";
                    parent.parentNode.insertBefore(link, parent);
                    break;
                case "organizations":
                    link.href = baseUrl + tagType + "/new";
                    parent.parentNode.insertBefore(link, parent);
                    break;
                default:
                    if (tagType.match(/^\d+$/)) {
                        // Flexible assets
                        link.href = organizationUrl + "assets/" + tagType + "/records/new";
                        parent.parentNode.insertBefore(link, parent);
                    }
            }
        }
    }

    function updateTagFieldCountBadge(tag) {
        const numberOfTags = getElementChildren(tag).length;
        const countTextNode = document.createTextNode(numberOfTags);
        const badge = document.createElement("span");
        badge.className = "badge epoxy-badge";
        badge.appendChild(countTextNode);
        const tagFieldLabel = tag.parentNode.previousSibling;
        const existingBadges = tagFieldLabel.getElementsByClassName("epoxy-badge");
        for (const node of existingBadges) {
            node.parentNode.removeChild(node);
        }
        tagFieldLabel.appendChild(badge);
    }

    function updateRelatedItemGroup(relatedItemGroup) {
        const children = getElementChildren(relatedItemGroup);
        const groupLabel = children[0];

        // Create badge
        const numberOfRelatedItems = children.length - 1;
        const countTextNode = document.createTextNode(numberOfRelatedItems);
        const badge = document.createElement("span");
        badge.className = "badge epoxy-badge";
        badge.appendChild(countTextNode);

        // Remove existing badge and add new one
        const existingBadges = groupLabel.querySelectorAll('.epoxy-badge');
        for (const badge of existingBadges) {
            badge.parentNode.removeChild(badge);
        }
        groupLabel.appendChild(badge);

        // Create copy button
        const button = document.createElement('span');
        button.className = 'copy-button copy-password-button margin-xsmall-horizontal';
        button.addEventListener('click', copyRelatedItems);
        const icon = document.createElement('i');
        icon.className = 'fa fa-clipboard';
        button.appendChild(icon);

        // Remove existing copy button and add new one
        const existingButtons = groupLabel.querySelectorAll('.copy-button');
        for (const btn of existingButtons) {
            btn.parentNode.removeChild(btn);
        }
        groupLabel.appendChild(button);
    }

    async function copyRelatedItems(event) {
        const group = event.currentTarget.closest('ul');
        const links = group.querySelectorAll('a.name');
        const items = [...links].map(l => l.textContent.trim()).join('\n');
        try {
            await navigator.clipboard.writeText(`${items}\n`);
            console.log('Copied related items list to the clipboard.');
        }
        catch {
            alert('We were unable to copy the list to the clipboard. Please press Ctrl+Shift+J to open the DevTools console and copy the items from there.');
            console.log(items);
        }
    }

    function addSuperstringSidebarSection(sidebar) {
        if (location.host != 'cascadepc.itglue.com') {
            return;
        }

        const sidebarContainer = sidebar.classList.contains('sidebar-container')
            ? sidebar
            : sidebar.closest('.sidebar-container') || sidebar;
        const sidebarContent = sidebarContainer.querySelector('.sidebar') || sidebarContainer;
        const superstringSections = sidebarContainer.querySelectorAll('.superstring');
        const existingSuperstring = superstringSections[superstringSections.length - 1] || null;
        const superstringHref = getSuperstringSidebarHref();

        console.debug('Epoxy: sidebar mutation detected.', {
            sidebar,
            sidebarContainer,
            sidebarContent,
            superstringCount: superstringSections.length,
        });

        if (existingSuperstring) {
            if (superstringSections.length > 1) {
                console.warn('Epoxy: removing duplicate Superstring sections.', {
                    superstringCount: superstringSections.length,
                    sidebarContent,
                });
                superstringSections.forEach((section, index) => {
                    if (index < superstringSections.length - 1) {
                        section.remove();
                    }
                });
            }
            if (superstringHref) {
                const link = existingSuperstring.querySelector('a[href]');
                if (link && link.href !== superstringHref) {
                    console.debug('Epoxy: updating Superstring link href.', {
                        previousHref: link.href,
                        nextHref: superstringHref,
                    });
                    link.href = superstringHref;
                }
            }
            if (sidebarContent.lastElementChild !== existingSuperstring) {
                console.debug('Epoxy: moving Superstring section to end of sidebar.', {
                    sidebarContent,
                    existingSuperstring,
                });
                sidebarContent.appendChild(existingSuperstring);
            }
            return;
        }

        // For the cascadepc.itglue.com tenant, add Superstring links
        // Match URLs for contacts, configurations, or contract items
        const pathTest = /\/(\d+)\/(contacts|configurations|assets\/92578.+\/records)\/(\d+)/;
        const match = location.pathname.match(pathTest);
        if (match) {
            const link = document.createElement('a');
            // Use 'contract-items' for contract item pages.
            const assetType = /assets\/92578/.test(match[2]) ? 'contract-items' : match[2];
            link.href =`https://superstring.cascadepc.com/bda/${assetType}/${match[3]}`;
            link.target = '_blank';
            link.rel = 'noreferrer noopener';
            link.appendChild(document.createTextNode('Open in Superstring'));
            if (match[2] == 'configurations') {
                const superstring = document.createElement('div');
                superstring.className = 'sidebar-section superstring-section superstring open';

                const headerContainer = document.createElement('div');
                headerContainer.className = 'collapsible-box-header';
                const header = document.createElement('h4');
                header.appendChild(document.createTextNode('Superstring'));
                headerContainer.appendChild(header);
                superstring.appendChild(headerContainer);

                const bodyContainer = document.createElement('div');
                bodyContainer.className = 'collapsible-box-body';
                const actionLinks = document.createElement('div');
                actionLinks.className = 'action-links';
                actionLinks.appendChild(link);
                bodyContainer.appendChild(actionLinks);
                superstring.appendChild(bodyContainer);

                console.debug('Epoxy: adding Superstring section to sidebar.', {
                    sidebarContent,
                    superstring,
                });
                sidebarContent.appendChild(superstring);
            }
            else {
                const superstring = document.createElement('div');
                superstring.id = 'superstring';
                superstring.className = 'section superstring';

                const header = document.createElement('h4');
                header.appendChild(document.createTextNode('Superstring'));
                superstring.appendChild(header);

                const actionLinks = document.createElement('div');
                actionLinks.className = 'action-links';
                actionLinks.appendChild(link);
                superstring.appendChild(actionLinks);

                console.debug('Epoxy: adding Superstring section to sidebar.', {
                    sidebarContent,
                    superstring,
                });
                sidebarContent.appendChild(superstring);
            }
        }
    }

    function getSuperstringSidebarHref() {
        // Match URLs for contacts, configurations, or contract items
        const pathTest = /\/(\d+)\/(contacts|configurations|assets\/92578.+\/records)\/(\d+)/;
        const match = location.pathname.match(pathTest);
        if (!match) {
            return null;
        }
        const assetType = /assets\/92578/.test(match[2]) ? 'contract-items' : match[2];
        return `https://superstring.cascadepc.com/bda/${assetType}/${match[3]}`;
    }
    
    function addSuperstringOrganizationSection(container) {
        if (location.host != 'cascadepc.itglue.com' || hasSuperstring(container)) {
            return;
        }

        // For the cascadepc.itglue.com tenant, add Superstring links
        // Match URLs for contacts, configurations, or contract items
        const pathTest = /\/(\d+)$/;
        const match = location.pathname.match(pathTest);
        if (match) {
            const link = document.createElement('a');
            link.href =`https://superstring.cascadepc.com/bda/organizations/${match[1]}`;
            link.target = '_blank';
            link.rel = 'noreferrer noopener';
            link.appendChild(document.createTextNode('Open in Superstring'));

            const superstring = document.createElement('div');
            superstring.className = 'recent-items flex-item superstring';

            const header = document.createElement('h4');
            header.appendChild(document.createTextNode('Superstring'));
            superstring.appendChild(header);

            const actionLinks = document.createElement('div');
            actionLinks.className = 'action';
            actionLinks.appendChild(link);
            superstring.appendChild(actionLinks);

            container.appendChild(superstring);
        }
    }

    function fixDattoRmmLinks(element) {
        const pattern = /https:\/\/([a-z\-]+)\.centrastage\.net\/csm\/device\/summary\/(\d+)/;
        const links = element.querySelectorAll('a.manage-adapter-link');
        links.forEach(link => {
            const match = link.href.match(pattern);
            if (match) {
                link.href = `https://${match[1]}rmm.centrastage.net/device/${match[2]}`;
            }
        });
    }

    function getElementChildren(element) {
        var childNodes = element.childNodes,
            children = [];

        for (var i = 0; i < childNodes.length; i++) {
            if (childNodes[i].nodeType == Node.ELEMENT_NODE) {
                children.push(childNodes[i]);
            }
        }

        return children;
    }

    const isRelatedItemGroup = el => {
        return el.classList && (
            el.classList.contains('related-item-group') ||
            el.classList.contains('related-items-group')
        );
    };

    const getRelatedItemGroups = el => el.querySelectorAll('.related-item-group, .related-items-group');

    const isPhoneHeader = el => /Phone$/.test(el.innerText);

    const isSidebar = el => {
        return el.classList && (
            el.classList.contains('sidebar') ||
            el.classList.contains('sidebar-container')
        );
    };

    const isIntegrationsSection = (el) => el.classList && el.classList.contains('configuration-sync-section');

    const hasSuperstring = el => el.querySelector('.superstring');

    const nextElementSibling = el => el.nextElementSibling;

    const parsePhoneElement = el => {
        const phoneTest = /\(?(\d{3})(?:\)\s|\-|\.)?(\d{3})[\-\.]?(\d{4})(?:\s+ext\.\s+(\d+))?/;
        const result = phoneTest.exec(el.innerText);
        if (!result) return null;
        return {
            el,
            areaCode: result[1],
            subscriberPrefix: result[2],
            subscriberNumber: result[3],
            extension: result[4],
        };
    };

    const isNotNull = x => x !== null;

    const createPhoneLink = ({ el, areaCode, subscriberPrefix, subscriberNumber, extension }) => {
        const link = document.createElement('a');
        const phoneNumber = `${areaCode}${subscriberPrefix}${subscriberNumber}`;
        link.href = extension ? `tel:${phoneNumber};${extension}` : `tel:${phoneNumber}`;
        const formattedNumber = `(${areaCode}) ${subscriberPrefix}-${subscriberNumber}`;
        const formattedNumberWithExt = extension ? `${formattedNumber} ext. ${extension}` : formattedNumber;
        const linkText = document.createTextNode(formattedNumberWithExt);
        link.appendChild(linkText);
        el.replaceChild(link, el.firstChild);
    };

    // Listen for changes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (isRelatedItemGroup(mutation.target)) {
                updateRelatedItemGroup(mutation.target);
            }
            else if (isSidebar(mutation.target)) {
                setTimeout(() => { addSuperstringSidebarSection(mutation.target); }, 250);
            }
            else if (isIntegrationsSection(mutation.target)) {
                fixDattoRmmLinks(mutation.addedNodes[0]);
            }
            else if (mutation.addedNodes[0] && mutation.addedNodes[0].tagName == 'BODY') {
                processElement(mutation.addedNodes[0]);
            }
            else {
                [...mutation.addedNodes].forEach(node => {
                    if (isRelatedItemGroup(node)) {
                        updateRelatedItemGroup(node);
                    }
                });
            }
        });
    });
    observer.observe(document, { childList: true, subtree: true });

    // Process the document when first loading the page
    processElement(document);
});
