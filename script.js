    (() => {
      const networkCanvas = document.getElementById('network-background');
      const networkContext = networkCanvas?.getContext('2d');
      const secondaryNetworkCanvas = document.getElementById('network-background-secondary');
      const secondaryNetworkContext = secondaryNetworkCanvas?.getContext('2d');
      const networkMotion = document.getElementById('network-motion');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const networkPalette = ['#456cff', '#28bd76', '#f0ac36', '#8d5cf0', '#45b7d7'];

      function seededRandom(seed) {
        let value = seed >>> 0;
        return () => {
          value += 0x6D2B79F5;
          let result = Math.imul(value ^ (value >>> 15), 1 | value);
          result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
          return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
        };
      }

      function drawNetworkDevice(context, node, index, width, soft = false) {
        const lineAlpha = soft ? '24' : '42';
        const fillAlpha = soft ? '58' : '88';
        const isDegraded = !soft && node.kind !== 'node' && index % 17 === 0;
        const deviceScale = soft ? 1.14 : 1.24;

        context.save();
        context.save();
        context.translate(node.x, node.y);
        context.scale(deviceScale, deviceScale);
        context.translate(-node.x, -node.y);
        context.lineWidth = soft ? 0.7 : 0.9;
        context.strokeStyle = `${node.color}${lineAlpha}`;
        context.fillStyle = `${node.color}${fillAlpha}`;

        if (node.kind === 'router') {
          context.strokeRect(node.x - 5.5, node.y - 5.5, 11, 11);
          context.beginPath();
          context.moveTo(node.x - 9, node.y);
          context.lineTo(node.x - 5.5, node.y);
          context.moveTo(node.x + 5.5, node.y);
          context.lineTo(node.x + 9, node.y);
          context.moveTo(node.x, node.y - 9);
          context.lineTo(node.x, node.y - 5.5);
          context.moveTo(node.x, node.y + 5.5);
          context.lineTo(node.x, node.y + 9);
          context.stroke();
        } else if (node.kind === 'switch') {
          context.strokeRect(node.x - 8, node.y - 4.5, 16, 9);
          for (let port = -4.5; port <= 4.5; port += 3) {
            context.fillRect(node.x + port - 0.7, node.y - 0.7, 1.4, 1.4);
          }
        } else {
          context.beginPath();
          context.arc(node.x, node.y, node.kind === 'probe' ? 7.5 : 4.6, 0, Math.PI * 2);
          context.stroke();
          if (node.kind === 'probe') {
            context.beginPath();
            context.moveTo(node.x - 10, node.y);
            context.lineTo(node.x - 6, node.y);
            context.moveTo(node.x + 6, node.y);
            context.lineTo(node.x + 10, node.y);
            context.stroke();
          }
        }

        context.beginPath();
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context.fill();

        if (isDegraded) {
          context.beginPath();
          context.setLineDash([2, 3]);
          context.arc(node.x, node.y, 12.5, 0, Math.PI * 2);
          context.strokeStyle = '#e3aa426e';
          context.stroke();
          context.setLineDash([]);
        }

        context.restore();

        const marginZone = Math.max(92, (width - 1180) / 2 + 68);
        const canLabel = !soft && width > 820 && node.kind !== 'node' && index % 4 === 0 && (node.x < marginZone || node.x > width - marginZone);
        if (canLabel) {
          const regions = ['DXB', 'FRA', 'SIN', 'AMS', 'LHR', 'IAD'];
          const region = regions[index % regions.length];
          const deviceName = node.kind === 'router' ? `RTR-${region}-${(index % 8) + 1}` : node.kind === 'switch' ? `SW-${region}-${(index % 12) + 1}` : `ICMP ${region}`;
          const metric = isDegraded ? 'loss 0.8%' : node.kind === 'switch' ? `${16 + (index % 8)}/24 ports` : `${18 + (index % 143)} ms`;
          const onRight = node.x > width / 2;
          context.font = '600 7px ui-monospace, SFMono-Regular, Menlo, monospace';
          context.textAlign = onRight ? 'right' : 'left';
          context.textBaseline = 'middle';
          context.fillStyle = isDegraded ? '#b37b25a8' : `${node.color}8a`;
          context.fillText(`${deviceName} · ${metric}`, node.x + (onRight ? -13 : 13), node.y);
        }

        context.restore();
      }


      function drawMicroTopologyDetail(context, width, height, random, soft = false) {
        const count = Math.min(240, Math.max(92, Math.floor((width * height) / 78000)));
        context.save();
        context.lineCap = 'round';

        for (let index = 0; index < count; index += 1) {
          const x = random() * width;
          const y = random() * height;
          const color = networkPalette[(index + Math.floor(random() * networkPalette.length)) % networkPalette.length];
          const radius = (soft ? 0.42 : 0.48) + random() * (soft ? 0.48 : 0.62);

          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fillStyle = `${color}${soft ? '18' : '20'}`;
          context.fill();

          if (index % 17 === 0) {
            const tick = 2.2 + random() * 2.8;
            context.beginPath();
            context.moveTo(x - tick, y);
            context.lineTo(x + tick, y);
            context.moveTo(x, y - tick);
            context.lineTo(x, y + tick);
            context.strokeStyle = `${color}${soft ? '14' : '1c'}`;
            context.lineWidth = 0.55;
            context.stroke();
          }

          if (index % 31 === 0) {
            context.beginPath();
            context.arc(x, y, 4.2 + random() * 3.5, 0, Math.PI * 2);
            context.strokeStyle = `${color}${soft ? '10' : '16'}`;
            context.lineWidth = 0.55;
            context.stroke();
          }
        }
        context.restore();
      }

      function drawLocalTopologyClusters(context, width, height, random) {
        const selectors = ['.hero', '#platform', '#workflow', '#reliability', '#contact'];
        const anchors = selectors.map((selector, index) => {
          const element = document.querySelector(selector);
          if (!element) return height * ((index + 0.5) / selectors.length);
          const rect = element.getBoundingClientRect();
          return rect.top + window.scrollY + rect.height * (index % 2 ? 0.58 : 0.36);
        });
        const placements = [];

        anchors.forEach((y, index) => {
          const primarySide = index % 2;
          placements.push({ y, side: primarySide, weight: 1 });
          if (width >= 700 && index > 0 && index < anchors.length - 1) {
            placements.push({ y: y + (random() - 0.5) * 230, side: 1 - primarySide, weight: 0.72 });
          }
        });

        placements.forEach((placement, clusterIndex) => {
          const margin = width < 700
            ? -10
            : Math.max(46, Math.min(142, (width - 1180) * 0.34 + 54));
          const centerX = placement.side ? width - margin : margin;
          const centerY = Math.max(90, Math.min(height - 90, placement.y));
          const radiusX = (width < 700 ? 82 : 124) + random() * (width < 700 ? 40 : 76);
          const radiusY = (width < 700 ? 62 : 88) + random() * (width < 700 ? 34 : 60);
          const color = networkPalette[(clusterIndex + 1) % networkPalette.length];
          const nodeCount = 13 + Math.floor(random() * 8);
          const nodes = [];

          context.save();
          context.beginPath();
          context.setLineDash([3, 8]);
          context.ellipse(centerX, centerY, radiusX * 1.08, radiusY * 1.08, -0.12 + random() * 0.24, 0, Math.PI * 2);
          context.strokeStyle = `${color}${width < 700 ? '1f' : '25'}`;
          context.lineWidth = 0.7;
          context.stroke();
          context.setLineDash([]);

          for (let index = 0; index < nodeCount; index += 1) {
            const angle = (index / nodeCount) * Math.PI * 2 + (random() - 0.5) * 0.32;
            const inset = index % 4 === 0 ? 0.46 + random() * 0.18 : 0.76 + random() * 0.23;
            nodes.push({
              x: centerX + Math.cos(angle) * radiusX * inset,
              y: centerY + Math.sin(angle) * radiusY * inset,
              radius: 0.85 + random() * 1.2,
              color: index % 5 === 0 ? networkPalette[(clusterIndex + 3) % networkPalette.length] : color,
              kind: index === 0 ? 'router' : index % 6 === 0 ? 'switch' : index % 4 === 0 ? 'probe' : 'node'
            });
          }

          nodes.forEach((node, index) => {
            const next = nodes[(index + 1) % nodes.length];
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.quadraticCurveTo(
              centerX + (random() - 0.5) * radiusX * 0.34,
              centerY + (random() - 0.5) * radiusY * 0.34,
              next.x,
              next.y
            );
            context.strokeStyle = `${node.color}${index % 3 === 0 ? '2b' : '1b'}`;
            context.lineWidth = index % 4 === 0 ? 0.9 : 0.58;
            context.stroke();

            if (index % 3 === 0) {
              context.beginPath();
              context.moveTo(centerX, centerY);
              context.lineTo(node.x, node.y);
              context.strokeStyle = `${color}1d`;
              context.lineWidth = 0.62;
              context.stroke();
            }
          });

          const exitX = placement.side ? width + 54 : -54;
          context.beginPath();
          context.moveTo(centerX, centerY);
          context.bezierCurveTo(
            centerX + (placement.side ? 92 : -92), centerY - 34,
            exitX - (placement.side ? 48 : -48), centerY + 42,
            exitX, centerY + 12
          );
          context.strokeStyle = `${color}34`;
          context.lineWidth = 0.9 + placement.weight * 0.35;
          context.stroke();

          nodes.forEach((node, index) => drawNetworkDevice(context, node, clusterIndex * 20 + index, width, true));

          if (width > 900) {
            const labelX = placement.side ? centerX - radiusX * 0.9 : centerX + radiusX * 0.9;
            context.fillStyle = `${color}72`;
            context.font = '600 7px ui-monospace, SFMono-Regular, Menlo, monospace';
            context.textAlign = placement.side ? 'right' : 'left';
            context.fillText(`AS${64512 + clusterIndex * 7} · 10.${clusterIndex + 16}.0.0/20`, labelX, centerY - radiusY - 12);
          }
          context.restore();
        });
      }

      function buildMobileTopology(width, height) {
        const random = seededRandom(733021);
        const documentY = (selector, fallback) => {
          const element = document.querySelector(selector);
          if (!element) return fallback;
          const rect = element.getBoundingClientRect();
          return rect.top + window.scrollY;
        };
        const heroBottom = documentY('.context-strip', Math.min(height * 0.2, 760));
        const platformY = documentY('#platform', height * 0.22);
        const workflowY = documentY('#workflow', height * 0.52);
        const reliabilityY = documentY('#reliability', height * 0.72);
        const contactY = documentY('#contact', height * 0.86);
        const routeDefinitions = [
          {
            color: networkPalette[0],
            d: `M -72 154 C ${(width * 0.18).toFixed(1)} 72, ${(width * 0.55).toFixed(1)} ${(heroBottom * 0.46).toFixed(1)}, ${(width + 66).toFixed(1)} ${(heroBottom - 88).toFixed(1)}`
          },
          {
            color: networkPalette[1],
            d: `M -34 ${(platformY + 126).toFixed(1)} C ${(width * 0.2).toFixed(1)} ${(platformY + 230).toFixed(1)}, ${(width * 0.04).toFixed(1)} ${(workflowY + 145).toFixed(1)}, -22 ${(reliabilityY + 112).toFixed(1)} S ${(width * 0.18).toFixed(1)} ${(contactY + 205).toFixed(1)}, -38 ${(height - 86).toFixed(1)}`
          },
          {
            color: networkPalette[4],
            d: `M ${(width + 36).toFixed(1)} ${(heroBottom + 74).toFixed(1)} C ${(width * 0.72).toFixed(1)} ${(platformY + 95).toFixed(1)}, ${(width * 0.98).toFixed(1)} ${(workflowY + 104).toFixed(1)}, ${(width + 24).toFixed(1)} ${(reliabilityY + 154).toFixed(1)} S ${(width * 0.76).toFixed(1)} ${(contactY + 242).toFixed(1)}, ${(width + 42).toFixed(1)} ${(height - 52).toFixed(1)}`
          },
          {
            color: networkPalette[3],
            d: `M -44 ${(workflowY + 42).toFixed(1)} C ${(width * 0.28).toFixed(1)} ${(workflowY - 18).toFixed(1)}, ${(width * 0.67).toFixed(1)} ${(workflowY + 112).toFixed(1)}, ${(width + 48).toFixed(1)} ${(workflowY + 58).toFixed(1)}`
          }
        ];

        routeDefinitions.forEach((route, index) => {
          const path = new Path2D(route.d);
          networkContext.strokeStyle = `${route.color}${index === 0 ? '52' : '3d'}`;
          networkContext.lineWidth = index === 0 ? 1.65 : 1.2;
          networkContext.lineCap = 'round';
          networkContext.stroke(path);
        });

        const mobileNodes = [];
        const density = Math.min(210, Math.max(108, Math.floor(height / 42)));
        for (let index = 0; index < density; index += 1) {
          const y = random() * height;
          const band = y < heroBottom ? 0 : y < workflowY ? 1 : y < reliabilityY ? 2 : y < contactY ? 3 : 4;
          const onRight = (band + index) % 3 !== 0;
          const x = onRight
            ? width * 0.76 + random() * width * 0.33
            : -width * 0.09 + random() * width * 0.31;
          const kindRoll = random();
          mobileNodes.push({
            x,
            y,
            radius: 1.15 + random() * 1.8,
            color: networkPalette[(band + index) % networkPalette.length],
            kind: kindRoll > 0.96 ? 'router' : kindRoll > 0.9 ? 'switch' : kindRoll > 0.78 ? 'probe' : 'node',
            side: onRight ? 1 : 0
          });
        }

        const hubYs = [heroBottom * 0.58, platformY + 185, workflowY + 120, reliabilityY + 145, contactY + 170];
        hubYs.forEach((y, index) => {
          mobileNodes.push({
            x: index % 2 ? width + 4 : -4,
            y,
            radius: 3.2,
            color: networkPalette[index % networkPalette.length],
            kind: index % 3 === 1 ? 'switch' : 'router',
            side: index % 2
          });
        });

        mobileNodes.forEach((node, index) => {
          const target = mobileNodes
            .slice(index + 1)
            .filter((candidate) => candidate.side === node.side && candidate.y > node.y && candidate.y - node.y < 190)
            .sort((a, b) => Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y))[0];
          if (target && random() > 0.34) {
            const bendX = node.side ? Math.min(width + 38, Math.max(node.x, target.x) + 28) : Math.max(-38, Math.min(node.x, target.x) - 28);
            networkContext.beginPath();
            networkContext.moveTo(node.x, node.y);
            networkContext.quadraticCurveTo(bendX, (node.y + target.y) / 2, target.x, target.y);
            networkContext.strokeStyle = `${node.color}2d`;
            networkContext.lineWidth = 0.78;
            networkContext.stroke();
          }
        });
        mobileNodes.forEach((node, index) => drawNetworkDevice(networkContext, node, index, width));

        const secondaryNodes = [];
        for (let index = 0; index < Math.floor(density * 0.58); index += 1) {
          const onRight = index % 2 === 0;
          secondaryNodes.push({
            x: onRight ? width * 0.84 + random() * width * 0.24 : -width * 0.08 + random() * width * 0.23,
            y: random() * height,
            radius: 0.8 + random() * 1.35,
            color: networkPalette[(index + 2) % networkPalette.length],
            kind: index % 19 === 0 ? 'probe' : 'node'
          });
        }
        secondaryNodes.forEach((node, index) => drawNetworkDevice(secondaryNetworkContext, node, index, width, true));
        drawLocalTopologyClusters(secondaryNetworkContext, width, height, seededRandom(184207));

        const idleRoutes = routeDefinitions.map((route, index) => `
          <path class="network-route" d="${route.d}" stroke="${route.color}" opacity="${index === 0 ? 0.58 : 0.4}" style="animation-delay:${(-index * 1.7).toFixed(1)}s;animation-duration:${(12 + index * 2.1).toFixed(1)}s"></path>
          ${!reduceMotion && index > 0 ? `<circle class="network-packet" r="2" fill="${route.color}" opacity=".74"><animateMotion dur="${(10 + index * 2.4).toFixed(1)}s" begin="${(4.2 + index * 0.7).toFixed(1)}s" repeatCount="indefinite" path="${route.d}"></animateMotion></circle>` : ''}
        `).join('');
        const assemblyRoute = reduceMotion ? '' : `
          <path class="mobile-assembly-route" d="${routeDefinitions[0].d}" stroke="${routeDefinitions[0].color}" stroke-width="2" opacity=".9"></path>
          <circle class="network-packet" r="2.8" fill="${routeDefinitions[1].color}" opacity=".96"><animateMotion dur="1.5s" begin="2.35s" repeatCount="1" fill="freeze" path="${routeDefinitions[0].d}"></animateMotion></circle>
        `;
        networkMotion.innerHTML = `${idleRoutes}${assemblyRoute}`;
      }

      function buildTopology() {
        if (!networkCanvas || !networkContext || !secondaryNetworkCanvas || !secondaryNetworkContext || !networkMotion) return;

        const width = document.documentElement.clientWidth || window.innerWidth;
        const footer = document.querySelector('.site-footer');
        const contentBottom = footer
          ? footer.getBoundingClientRect().bottom + window.scrollY
          : Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
        const height = Math.max(window.innerHeight, Math.ceil(contentBottom));
        const pixelRatio = width < 700 ? 0.72 : 0.86;
        const secondaryPixelRatio = width < 900 ? 0.5 : 0.62;
        const useSecondaryLayer = width >= 700;
        const density = Math.min(width < 700 ? 230 : 440, Math.max(180, Math.floor((width * height) / 21000)));

        networkCanvas.width = Math.max(1, Math.round(width * pixelRatio));
        networkCanvas.height = Math.round(height * pixelRatio);
        networkCanvas.style.width = `${width}px`;
        networkCanvas.style.height = `${height}px`;
        networkContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        networkContext.clearRect(0, 0, width, height);

        secondaryNetworkCanvas.style.width = `${width}px`;
        secondaryNetworkCanvas.style.height = `${height}px`;
        if (useSecondaryLayer) {
          secondaryNetworkCanvas.width = Math.max(1, Math.round(width * secondaryPixelRatio));
          secondaryNetworkCanvas.height = Math.max(1, Math.round(height * secondaryPixelRatio));
          secondaryNetworkContext.setTransform(secondaryPixelRatio, 0, 0, secondaryPixelRatio, 0, 0);
          secondaryNetworkContext.clearRect(0, 0, width, height);
        } else {
          /* Do not allocate a second page-sized bitmap on narrow screens. */
          secondaryNetworkCanvas.width = 1;
          secondaryNetworkCanvas.height = 1;
          secondaryNetworkContext.setTransform(1, 0, 0, 1, 0, 0);
          secondaryNetworkContext.clearRect(0, 0, 1, 1);
        }

        networkMotion.setAttribute('viewBox', `0 0 ${width} ${height}`);
        networkMotion.style.width = `${width}px`;
        networkMotion.style.height = `${height}px`;

        const random = seededRandom(902431);
        const nodes = [];

        for (let index = 0; index < density; index += 1) {
          const kindRoll = random();
          nodes.push({
            x: random() * width,
            y: random() * height,
            radius: 0.9 + random() * 1.7,
            color: networkPalette[Math.floor(random() * networkPalette.length)],
            kind: kindRoll > 0.97 ? 'router' : kindRoll > 0.92 ? 'switch' : kindRoll > 0.82 ? 'probe' : 'node'
          });
        }

        const routes = [];
        const routeCount = Math.max(12, Math.min(18, Math.round(height / 360)));

        for (let routeIndex = 0; routeIndex < routeCount; routeIndex += 1) {
          const baseY = height * (0.025 + (routeIndex / Math.max(1, routeCount - 1)) * 0.95);
          const color = networkPalette[routeIndex % networkPalette.length];
          let cursorX = 0;
          let cursorY = baseY + (random() - 0.5) * 120;
          let pathData = `M ${cursorX.toFixed(1)} ${cursorY.toFixed(1)}`;

          while (cursorX < width) {
            const nextX = Math.min(width, cursorX + 150 + random() * 230);
            const nextY = baseY + (random() - 0.5) * 240;
            const controlOneX = cursorX + (nextX - cursorX) * 0.34;
            const controlOneY = cursorY + (random() - 0.5) * 100;
            const controlTwoX = cursorX + (nextX - cursorX) * 0.72;
            const controlTwoY = nextY + (random() - 0.5) * 90;
            pathData += ` C ${controlOneX.toFixed(1)} ${controlOneY.toFixed(1)}, ${controlTwoX.toFixed(1)} ${controlTwoY.toFixed(1)}, ${nextX.toFixed(1)} ${nextY.toFixed(1)}`;
            cursorX = nextX;
            cursorY = nextY;
          }

          const volume = 0.24 + random() * 0.76;
          const lossy = routeIndex % 7 === 4;
          routes.push({ d: pathData, color, delay: -(random() * 9).toFixed(2), duration: 9 + random() * 8, volume, lossy });
          const routePath = new Path2D(pathData);
          if (routeIndex % 3 === 0) {
            networkContext.save();
            networkContext.translate(0, 4 + volume * 2);
            networkContext.strokeStyle = `${color}14`;
            networkContext.lineWidth = 0.7 + volume * 0.9;
            networkContext.setLineDash([4, 18]);
            networkContext.stroke(routePath);
            networkContext.restore();
          }
          networkContext.strokeStyle = `${color}2e`;
          networkContext.lineWidth = 0.82 + volume * 1.35;
          networkContext.lineCap = 'round';
          networkContext.setLineDash(lossy ? [3, 10] : []);
          networkContext.stroke(routePath);
          networkContext.setLineDash([]);
        }

        nodes.forEach((node, index) => {
          const nearest = nodes
            .map((candidate, candidateIndex) => ({ candidate, candidateIndex, distance: Math.hypot(candidate.x - node.x, candidate.y - node.y) }))
            .filter((item) => item.candidateIndex > index && item.distance < 180)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);

          nearest.forEach((item) => {
            if (random() > 0.56) return;
            const target = item.candidate;
            const dx = target.x - node.x;
            const dy = target.y - node.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const bend = (random() - 0.5) * 34;
            const normalX = -dy / distance;
            const normalY = dx / distance;
            networkContext.beginPath();
            networkContext.moveTo(node.x, node.y);
            networkContext.quadraticCurveTo(
              (node.x + target.x) / 2 + normalX * bend,
              (node.y + target.y) / 2 + normalY * bend,
              target.x,
              target.y
            );
            networkContext.strokeStyle = `${node.color}23`;
            networkContext.lineWidth = 0.65 + random() * 0.7;
            networkContext.stroke();
          });
        });

        nodes.forEach((node, index) => {
          drawNetworkDevice(networkContext, node, index, width);
        });
        drawMicroTopologyDetail(networkContext, width, height, seededRandom(336711), false);

        const secondaryRandom = seededRandom(419027);
        const secondaryDensity = useSecondaryLayer ? Math.max(90, Math.floor(density * 0.48)) : 0;
        const secondaryNodes = [];
        const secondaryRoutes = [];

        for (let index = 0; index < secondaryDensity; index += 1) {
          const kindRoll = secondaryRandom();
          secondaryNodes.push({
            x: secondaryRandom() * width,
            y: secondaryRandom() * height,
            radius: 0.8 + secondaryRandom() * 1.5,
            color: networkPalette[(Math.floor(secondaryRandom() * networkPalette.length) + 2) % networkPalette.length],
            kind: kindRoll > 0.975 ? 'router' : kindRoll > 0.93 ? 'switch' : kindRoll > 0.84 ? 'probe' : 'node'
          });
        }

        const secondaryRouteCount = useSecondaryLayer ? Math.max(6, Math.min(9, Math.round(height / 620))) : 0;
        for (let routeIndex = 0; routeIndex < secondaryRouteCount; routeIndex += 1) {
          const baseY = height * (0.04 + (routeIndex / Math.max(1, secondaryRouteCount - 1)) * 0.92);
          const color = networkPalette[(routeIndex + 2) % networkPalette.length];
          let cursorX = 0;
          let cursorY = baseY + (secondaryRandom() - 0.5) * 160;
          let pathData = `M ${cursorX.toFixed(1)} ${cursorY.toFixed(1)}`;

          while (cursorX < width) {
            const nextX = Math.min(width, cursorX + 130 + secondaryRandom() * 250);
            const nextY = baseY + (secondaryRandom() - 0.5) * 290;
            const controlOneX = cursorX + (nextX - cursorX) * 0.3;
            const controlOneY = cursorY + (secondaryRandom() - 0.5) * 130;
            const controlTwoX = cursorX + (nextX - cursorX) * 0.76;
            const controlTwoY = nextY + (secondaryRandom() - 0.5) * 105;
            pathData += ` C ${controlOneX.toFixed(1)} ${controlOneY.toFixed(1)}, ${controlTwoX.toFixed(1)} ${controlTwoY.toFixed(1)}, ${nextX.toFixed(1)} ${nextY.toFixed(1)}`;
            cursorX = nextX;
            cursorY = nextY;
          }

          secondaryRoutes.push({
            d: pathData,
            color,
            delay: -(secondaryRandom() * 11).toFixed(2),
            duration: 12 + secondaryRandom() * 10,
            opacity: 0.3,
            volume: 0.18 + secondaryRandom() * 0.52,
            lossy: routeIndex % 9 === 5
          });
          const routePath = new Path2D(pathData);
          secondaryNetworkContext.strokeStyle = `${color}25`;
          secondaryNetworkContext.lineWidth = 0.68 + secondaryRoutes[secondaryRoutes.length - 1].volume * 1.1;
          secondaryNetworkContext.lineCap = 'round';
          secondaryNetworkContext.setLineDash(secondaryRoutes[secondaryRoutes.length - 1].lossy ? [3, 11] : []);
          secondaryNetworkContext.stroke(routePath);
          secondaryNetworkContext.setLineDash([]);
        }

        secondaryNodes.forEach((node, index) => {
          const nearest = secondaryNodes
            .map((candidate, candidateIndex) => ({ candidate, candidateIndex, distance: Math.hypot(candidate.x - node.x, candidate.y - node.y) }))
            .filter((item) => item.candidateIndex > index && item.distance < 205)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 2);

          nearest.forEach((item) => {
            if (secondaryRandom() > 0.5) return;
            const target = item.candidate;
            const dx = target.x - node.x;
            const dy = target.y - node.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const bend = (secondaryRandom() - 0.5) * 46;
            secondaryNetworkContext.beginPath();
            secondaryNetworkContext.moveTo(node.x, node.y);
            secondaryNetworkContext.quadraticCurveTo(
              (node.x + target.x) / 2 + (-dy / distance) * bend,
              (node.y + target.y) / 2 + (dx / distance) * bend,
              target.x,
              target.y
            );
            secondaryNetworkContext.strokeStyle = `${node.color}1d`;
            secondaryNetworkContext.lineWidth = 0.58 + secondaryRandom() * 0.65;
            secondaryNetworkContext.stroke();
          });
        });

        secondaryNodes.forEach((node, index) => {
          drawNetworkDevice(secondaryNetworkContext, node, index, width, true);
        });
        drawMicroTopologyDetail(secondaryNetworkContext, width, height, seededRandom(552019), true);
        drawLocalTopologyClusters(secondaryNetworkContext, width, height, seededRandom(731905));

        const allRoutes = [...routes, ...secondaryRoutes];
        const movingRoutes = allRoutes.map((route, index) => {
          const animateRoute = !reduceMotion && width >= 700 && index < 10 && index % 2 === 0;
          const routeClass = `network-route${route.lossy ? ' loss-route' : ''}${animateRoute ? '' : ' route-static'}`;
          return `
            ${animateRoute && index % 4 === 0 ? `<path class="route-afterimage" d="${route.d}" stroke="${route.color}" style="animation-delay:${(-index * 0.6).toFixed(1)}s"></path>` : ''}
            <path class="${routeClass}" d="${route.d}" stroke="${route.color}" opacity="${route.opacity ?? 0.5}" style="stroke-width:${(0.82 + (route.volume ?? 0.4) * 1.35).toFixed(2)}px;animation-delay:${route.delay}s;animation-duration:${route.duration.toFixed(1)}s"></path>
            ${index < 14 && index % 5 === 1 ? `<path class="hop-markers" d="${route.d}" stroke="${route.color}"></path>` : ''}
            ${animateRoute && index % 4 === 0 ? `<circle class="network-packet${route.lossy ? ' loss-packet' : ''}" r="2.15" fill="${route.color}" opacity=".78"><animateMotion dur="${(route.duration * 0.82).toFixed(1)}s" begin="${route.delay}s" repeatCount="indefinite" path="${route.d}"></animateMotion></circle>` : ''}
          `;
        }).join('');

        const probeSweeps = nodes
          .map((node, index) => ({ node, index }))
          .filter(({ node, index }) => node.kind === 'probe' && index % 11 === 0)
          .slice(0, width < 700 ? 0 : 4)
          .map(({ node }, index) => `<circle class="probe-sweep" cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="7" stroke="${node.color}" style="animation-delay:${(-index * 0.72).toFixed(2)}s"></circle>`)
          .join('');

        const anchors = width > 760
          ? [...document.querySelectorAll('.product-window, .feature-card, .incident-card, .mac-principle, .contact-layout')]
          : [];
        const margin = Math.max(20, (width - Math.min(width - 40, 1180)) / 2);
        const spineX = Math.max(28, margin - 44);
        const anchorData = anchors.map((element, index) => {
          const rect = element.getBoundingClientRect();
          return {
            x: Math.max(spineX + 54, rect.left - 18),
            y: rect.top + window.scrollY + Math.min(126, rect.height * 0.34),
            color: networkPalette[index % networkPalette.length]
          };
        });

        const branches = anchorData.map((anchor, index) => {
          const startX = spineX + Math.sin(index * 1.18) * 11;
          const path = `M ${startX.toFixed(1)} ${anchor.y.toFixed(1)} C ${(startX + 40).toFixed(1)} ${(anchor.y - 24).toFixed(1)}, ${(anchor.x - 45).toFixed(1)} ${(anchor.y + 18).toFixed(1)}, ${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)}`;
          return `<path class="network-branch" d="${path}" stroke="${anchor.color}" opacity=".52" style="animation-delay:${(-index * 0.42).toFixed(2)}s"></path><circle class="network-anchor" cx="${anchor.x.toFixed(1)}" cy="${anchor.y.toFixed(1)}" r="5" stroke="${anchor.color}"></circle>`;
        }).join('');

        networkMotion.innerHTML = `${movingRoutes}${probeSweeps}${branches}`;
      }

      function rebuildTopology() {
        buildTopology();
      }

      const menuButton = document.querySelector('.menu-button');
      const mobileMenu = document.getElementById('mobile-menu');

      function setMobileMenu(open, restoreFocus = false) {
        menuButton?.setAttribute('aria-expanded', String(open));
        menuButton?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        mobileMenu?.classList.toggle('is-open', open);
        mobileMenu?.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('nav-open', open);
        if (!open && restoreFocus) menuButton?.focus();
      }

      menuButton?.addEventListener('click', () => {
        const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
        setMobileMenu(!isOpen);
      });

      mobileMenu?.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          setMobileMenu(false);
        });
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
          setMobileMenu(false, true);
        }
      });

      document.addEventListener('pointerdown', (event) => {
        const header = document.querySelector('.site-header');
        if (menuButton?.getAttribute('aria-expanded') === 'true' && header && !header.contains(event.target)) {
          setMobileMenu(false);
        }
      });

      const sectionNavigation = [...document.querySelectorAll('[data-section-link]')];
      const trackedSections = ['platform', 'workflow', 'reliability', 'contact']
        .map((id) => document.getElementById(id))
        .filter(Boolean);
      const sectionIndex = document.querySelector('.section-index');
      const navContextNumber = document.querySelector('[data-nav-number]');
      const navContextLabel = document.querySelector('[data-nav-label]');
      const navigationLabels = {
        '': ['00', 'Overview'],
        platform: ['01', 'Architecture'],
        workflow: ['02', 'Data path'],
        reliability: ['03', 'Monitoring as code'],
        contact: ['04', 'Contact']
      };
      let navigationFrame = 0;
      let lastActiveId = null;

      function updateActiveNavigation() {
        navigationFrame = 0;
        const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        document.documentElement.style.setProperty('--page-progress', String(Math.min(1, Math.max(0, window.scrollY / scrollRange))));
        const focusLine = Math.min(window.innerHeight * 0.36, 360);
        let activeId = '';

        trackedSections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= focusLine && rect.bottom > focusLine) activeId = section.id;
        });

        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6) {
          activeId = 'contact';
        }

        if (activeId !== lastActiveId) {
          const [number, label] = navigationLabels[activeId] || navigationLabels[''];
          if (navContextNumber) navContextNumber.textContent = number;
          if (navContextLabel) navContextLabel.textContent = label;
          lastActiveId = activeId;
        }

        sectionNavigation.forEach((link) => {
          const isActive = link.dataset.sectionLink === activeId;
          link.classList.toggle('is-active', isActive);
          if (isActive) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });

        sectionIndex?.classList.toggle('on-dark', activeId === 'workflow' || activeId === 'contact');
      }

      function requestNavigationUpdate() {
        if (navigationFrame) return;
        navigationFrame = window.requestAnimationFrame(updateActiveNavigation);
      }

      window.addEventListener('scroll', requestNavigationUpdate, { passive: true });

      document.querySelectorAll('[data-range]').forEach((button) => {
        button.addEventListener('click', () => {
          document.querySelectorAll('[data-range]').forEach((item) => item.setAttribute('aria-pressed', 'false'));
          button.setAttribute('aria-pressed', 'true');
        });
      });

      const form = document.getElementById('signup-form');

      form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const email = String(data.get('email') || '').trim();
        const question = String(data.get('message') || '').trim();
        if (!email || !question) return;

        const subject = name ? `monNETtoring question from ${name}` : 'monNETtoring question';
        const body = [
          name ? `Name: ${name}` : '',
          `Email: ${email}`,
          '',
          'Question:',
          question
        ].filter((line, index, lines) => line || (index > 0 && index < lines.length - 1)).join('\n');

        window.location.href = `mailto:monnettoring@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      });

      document.querySelectorAll('.architecture-graph').forEach((graph) => {
        graph.querySelectorAll('.arch-edge').forEach((edge, index) => edge.style.setProperty('--edge-i', index));
        graph.querySelectorAll('.arch-node').forEach((node, index) => node.style.setProperty('--node-i', index));
      });

      /* Keep section content in its final layout from the beginning. Scroll-triggered
         reveals and graph-assembly transitions can make precision-trackpad momentum
         feel uneven when a new section enters the viewport. */
      const revealItems = [...document.querySelectorAll('[data-reveal]')];
      revealItems.forEach((item) => item.classList.add('is-visible'));

      /* Small text reveal only. IntersectionObserver is asynchronous and does not
         intercept scroll input. We animate a few text nodes once using only
         opacity/transform, so there is no reflow and no trackpad momentum logic. */
      const textAppearItems = [...document.querySelectorAll([
        '.hero-title > h1',
        '.hero-summary > p',
        '.section-heading > h2',
        '.contact-header > h2',
        '.monNETtoring-mark-copy > h2'
      ].join(','))];

      if (!reduceMotion && 'IntersectionObserver' in window && textAppearItems.length) {
        textAppearItems.forEach((item) => item.classList.add('text-appear-pending'));
        const textAppearObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-text-visible');
            observer.unobserve(entry.target);
          });
        }, {
          threshold: 0.08,
          rootMargin: '120px 0px 80px 0px'
        });
        textAppearItems.forEach((item) => textAppearObserver.observe(item));
      }

      /* Motion lifecycle manager -------------------------------------------------
         Trackpad scrolling should never compete with long-running SVG motion.
         CSS animations are paused through classes above; SMIL animateMotion is
         paused explicitly because CSS animation-play-state does not control it. */
      const rootElement = document.documentElement;
      const heavyTopologySurfaces = [...document.querySelectorAll(
        '.architecture-board, .flow-map, .schema-graph, .lane-map, .repo-map, .config-window, .repo-reference'
      )];
      const topologySvgs = new Map(
        heavyTopologySurfaces.map((surface) => [surface, [...surface.querySelectorAll('svg')]])
      );
      const surfacePauseState = new WeakMap();
      let networkPauseState = null;

      function pauseSvg(svg) {
        try { svg?.pauseAnimations?.(); } catch (_) {}
      }

      function resumeSvg(svg) {
        try { svg?.unpauseAnimations?.(); } catch (_) {}
      }

      function setNetworkPaused(paused) {
        if (networkPauseState === paused) return;
        networkPauseState = paused;
        if (paused) pauseSvg(networkMotion);
        else resumeSvg(networkMotion);
      }

      function setSurfacePaused(surface, paused) {
        if (surfacePauseState.get(surface) === paused) return;
        surfacePauseState.set(surface, paused);
        (topologySvgs.get(surface) || []).forEach((svg) => {
          if (paused) pauseSvg(svg);
          else resumeSvg(svg);
        });
      }

      function syncMotionState() {
        const globallyPaused = document.hidden || reduceMotion;
        rootElement.classList.toggle('page-hidden', document.hidden);
        setNetworkPaused(globallyPaused);

        heavyTopologySurfaces.forEach((surface) => {
          setSurfacePaused(surface, globallyPaused || surface.classList.contains('perf-offscreen'));
        });
      }

      /* Keep native trackpad momentum completely untouched. Motion is not
         paused/restarted on wheel or scroll events; only tab visibility and
         true off-screen state control topology animation. */

      document.addEventListener('visibilitychange', syncMotionState, { passive: true });

      if ('IntersectionObserver' in window && heavyTopologySurfaces.length) {
        const topologyObserver = new IntersectionObserver((entries) => {
          const globallyPaused = document.hidden || reduceMotion;
          entries.forEach((entry) => {
            const offscreen = !entry.isIntersecting;
            entry.target.classList.toggle('perf-offscreen', offscreen);
            setSurfacePaused(entry.target, globallyPaused || offscreen);
          });
        }, {
          threshold: 0.001,
          rootMargin: '650px 0px 650px 0px'
        });
        heavyTopologySurfaces.forEach((surface) => topologyObserver.observe(surface));
      }

      /* Ensure browsers that start with the page in a background tab do not
         briefly run the topology before the first visibilitychange event. */
      syncMotionState();

      let resizeTimer = 0;
      let lastTopologyWidth = document.documentElement.clientWidth || window.innerWidth;
      window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          const nextWidth = document.documentElement.clientWidth || window.innerWidth;
          if (nextWidth > 820) setMobileMenu(false);

          /* Mobile browser chrome can change viewport height while scrolling.
             Rebuild the large topology only for a real width/layout change. */
          if (Math.abs(nextWidth - lastTopologyWidth) >= 16) {
            lastTopologyWidth = nextWidth;
            rebuildTopology();
            syncMotionState();
          }
          requestNavigationUpdate();
        }, 160);
      }, { passive: true });

      rebuildTopology();
      syncMotionState();
      updateActiveNavigation();
    })();
