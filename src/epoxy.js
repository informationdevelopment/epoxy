window.addEventListener("pageshow", () => {
    function processElement(element) {
        // Add tag field badges
        const tagFields = Array.from(element.querySelectorAll(".tags"));
        tagFields.forEach(updateTagFieldCountBadge);

        // Add related item badges
        const relatedItemGroups = element.querySelectorAll(".related-item-group, .related-items-group");
        relatedItemGroups.forEach(updateRelatedItemGroupCountBadge);

        // Format phone numbers
        const dtList = [...element.querySelectorAll('dt')];
        dtList
            .filter(isPhoneHeader)
            .map(nextElementSibling)
            .map(parsePhoneElement)
            .filter(isNotNull)
            .forEach(createPhoneLink);

        // Fix Autotask integration "Manage" links for configurations
        const links = element.querySelectorAll('.manage-adapter-link');
        links.forEach(fixAutotaskConfigurationManageLink);

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

    function updateRelatedItemGroupCountBadge(relatedItemGroup) {
        // Create badge
        var children = getElementChildren(relatedItemGroup);
        var numberOfRelatedItems = children.length - 1;
        var countTextNode = document.createTextNode(numberOfRelatedItems);
        var badge = document.createElement("span");
        badge.className = "badge epoxy-badge";
        badge.appendChild(countTextNode);

        var groupLabel = children[0];
        var existingBadges = groupLabel.getElementsByClassName("epoxy-badge");
        for (let badge of existingBadges) {
            badge.parentNode.removeChild(badge);
        }
        groupLabel.appendChild(badge);
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

    const isPhoneHeader = el => /Phone$/.test(el.innerText);

    const nextElementSibling = el => el.nextElementSibling;

    const parsePhoneElement = el => {
        const phoneTest = /(\d{3})(\d{3})(\d{4})(?:\s+ext\.\s+(\d+))?/;
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

    const fixAutotaskConfigurationManageLink = link => {
        const linkTest = /(https:\/\/\w+\.autotask\.net)\/autotask\/views\/ConfigurationManagement\/new_edit_installed_product\.aspx\?InstalledProductID=(\d+)&cmd=edit/i;
        const result = linkTest.exec(link.href);
        if (result) {
            link.href = `${result[1]}/Mvc/CRM/InstalledProductDetail.mvc?installedProductId=${result[2]}`;
        }
    };

    // Start processing
    // ==========================

    // Listen for changes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            processElement(mutation.target);
        });
    });
    observer.observe(document, { childList: true, subtree: true });
    processElement(document);
});
