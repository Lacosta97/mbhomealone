        if (photoEl) {
            const src = getAvatarSrc(profile);

            // если файла с кодом нет – один раз подменим на гостя
            photoEl.onerror = function() {
                if (photoEl.src.indexOf(GUEST_AVATAR) === -1) {
                    photoEl.src = GUEST_AVATAR;
                }
            };

            photoEl.src = src;
        }