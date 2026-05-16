import gsap from 'gsap'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'

gsap.registerPlugin(Physics2DPlugin)

// 粒子数量（原组件常量）
const DOT_AMOUNT = 40
type TimelineLike = gsap.core.Tween | gsap.core.Timeline | null

/**
 * GSAP 动画清理小工具：统一 pause + kill
 */
const kill = (anim: TimelineLike) => {
    if (anim) {
        anim.pause()
        anim.kill()
    }
}

/**
 * 创建 SVG 容器及子元素
 */
const createSVG = (
    width: number,
    height: number,
    className: string,
    childType: 'circle' | 'rect',
    childAttributes: Record<string, string>
): { svg: SVGSVGElement; child: SVGCircleElement | SVGRectElement } => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add(className)

    const child = document.createElementNS('http://www.w3.org/2000/svg', childType)
    svg.setAttributeNS('http://www.w3.org/2000/svg', 'viewBox', `0 0 ${width} ${height}`)

    for (const [attr, value] of Object.entries(childAttributes)) {
        child.setAttribute(attr, value)
    }

    svg.appendChild(child)

    return { svg, child: child as SVGCircleElement | SVGRectElement }
}

/**
 * GSAP 动画封装
 */
export function useGsapAnimations() {
    let containerEl: HTMLElement | null = null // 容器引用

    // DOM 引用
    let dotsSvg: SVGSVGElement | null = null // 点阵 SVG 容器
    let circleProto: SVGCircleElement | null = null // 点阵原型圆（用于克隆）
    let strokeGroup: HTMLDivElement | null = null // 描边容器（包含两条描边）

    // GSAP 时间线引用
    let masterTl: gsap.core.Timeline | null = null // 粒子主时间线（片段容器）
    let driverTl: gsap.core.Tween | null = null // 驱动器：循环推进 masterTl 的 time

    /** DOM 移除小工具，存在性校验避免异常 */
    const removeChild = (parent: HTMLElement | null, child: Element | null) => {
        if (parent && child && parent.contains(child)) {
            parent.removeChild(child)
        }
    }

    /**
     * 初始化点阵 SVG 容器（不立即挂载到 DOM）
     * @param width 按钮宽度
     * @param height 按钮高度
     */
    const setupDotsLayer = (width: number, height: number): void => {
        const createdDots = createSVG(width, height, 'dots', 'circle', {
            cx: '0',
            cy: '0',
            r: '0'
        })
        dotsSvg = createdDots.svg
        circleProto = createdDots.child as SVGCircleElement
    }

    /**
     * 初始化描边容器（不立即挂载到 DOM）
     * @param width 按钮宽度
     * @param height 按钮高度
     * @param borderRadius 圆角（基于按钮样式，内部描边略小）
     */
    const setupStrokeLayer = (width: number, height: number, borderRadius: number): void => {
        strokeGroup = document.createElement('div')
        strokeGroup.classList.add('stroke')
        const tempBorderRadius = borderRadius - 4

        const { svg: strokeLine } = createSVG(width, height, 'stroke-line', 'rect', {
            x: '1',
            y: '1',
            width: 'calc(100% - 2px)',
            height: 'calc(100% - 2px)',
            rx: String(tempBorderRadius),
            ry: String(tempBorderRadius),
            pathLength: '10'
        })

        // 两条描边叠加，形成更丰富的描边动画质感
        strokeGroup.appendChild(strokeLine)
        strokeGroup.appendChild(strokeLine.cloneNode(true))
    }

    /**
     * 创建粒子主时间线
     * - masterTl 仅作为片段容器，由 driverTl 驱动其 time 实现循环推进
     * @param width 按钮宽度
     * @param height 按钮高度
     */
    const createParticlesTimeline = (width: number, height: number): void => {
        if (!dotsSvg || !circleProto) return

        masterTl = gsap.timeline({ paused: true, repeat: -1 })

        for (let i = 0; i < DOT_AMOUNT; i++) {
            const p = (circleProto as SVGCircleElement).cloneNode(true) as SVGCircleElement
            dotsSvg.appendChild(p)

            gsap.set(p, {
                attr: {
                    // 稍微靠上一点，并且左右分散一些
                    cx: gsap.utils.random(width * 0.2, width * 0.8),
                    cy: height * gsap.utils.random(0.6, 0.85),
                    r: 0
                }
            })

            const durationRandom = gsap.utils.random(2, 4)
            const tl = gsap.timeline({})

            // 运动阶段
            tl.to(
                p, // 动画目标：单个粒子元素（通常是 SVG 的 <circle> 等形状）
                {
                    // 基础动画配置
                    duration: durationRandom, // 动画时长：随机值
                    rotation: i % 2 === 0 ? 200 : -200, // 旋转角度：偶数顺时针、奇数逆时针
                    attr: {
                        // 操作 SVG 元素属性（GSAP attr 插件）
                        r: gsap.utils.random(1.2, 2.5), // 粒子半径：随机 1.2~2.5 像素
                        cy: height * gsap.utils.random(0.5, 0.9) // 粒子 Y 坐标：基于画布高度，在 50%~90% 区间随机
                    },
                    // 物理运动配置（GSAP Physics2D 插件）
                    physics2D: {
                        angle: gsap.utils.random(0, 360), // 初始运动角度：0~360° 随机
                        gravity: gsap.utils.random(-40, 20), // 重力：-40（上浮）~20（下坠）随机
                        velocity: gsap.utils.random(8, 20) // 初速度：8~20 px/s
                    }
                }
            )

            // 运动结束后隐藏粒子（不 kill 子时间线），下次由 enter 重置再播放
            tl.eventCallback('onComplete', () => {
                gsap.set(p, { attr: { r: 0 }, opacity: 0, display: 'none' })
            })

            masterTl.add(tl, i / 3)
        }

        // 删除原型圆
        if (circleProto && dotsSvg) {
            dotsSvg.removeChild(circleProto)
        }
    }

    /**
     * 创建驱动器时间线：循环推进 masterTl 的 time
     * - 使用 repeat 与 onRepeat 回调复位所有粒子，保障连续观感
     */
    const createDriverTimeline = (): void => {
        if (!masterTl) return

        driverTl = gsap.to(masterTl, {
            duration: masterTl.duration(),
            repeat: -1,
            repeatDelay: 0,
            yoyo: false,
            ease: 'none',
            time: masterTl.duration(),
            paused: true,
            onRepeat: () => {
                // 每轮结束（到达末尾并立即跳回起点）时，重置并显示所有粒子
                if (dotsSvg) {
                    const nodes = Array.from(dotsSvg.querySelectorAll('circle'))
                    nodes.forEach(node => {
                        gsap.set(node, { attr: { r: 0 }, opacity: 1, display: '' })
                    })
                }
                // 保障主时间线回到起点
                if (masterTl) {
                    masterTl.time(0)
                }
            }
        })
    }

    /**
     * 初始化
     */
    const init = (container: HTMLElement): void => {
        if (!container) return
        containerEl = container

        try {
            const width = container.offsetWidth
            const height = container.offsetHeight
            const style = getComputedStyle(container)
            const borderRadius = parseInt(style.borderRadius, 10) || 0

            // 1. 初始化各层动画资源
            setupDotsLayer(width, height)
            setupStrokeLayer(width, height, borderRadius)

            // 2. 挂载到 DOM（顺序保持与原实现一致）
            if (dotsSvg) {
                container.appendChild(dotsSvg)
            }
            if (strokeGroup) {
                container.appendChild(strokeGroup)
            }

            // 3. 创建各类动画时间线
            createParticlesTimeline(width, height)
            createDriverTimeline()
        } catch {
            // 忽略初始化异常，防止因单次渲染问题导致页面崩溃
        }
    }

    /**
     * 统一控制动画开始/结束
     * @param type 'play' | 'pause'
     * @returns
     */
    const handleAnimation = (type: 'play' | 'pause' = 'play'): void => {
        const container = containerEl

        if (type === 'play') {
            gsap.to(container, {
                '--generate-button-dots-opacity': '.5',
                duration: 0.25,
                onStart: () => {
                    // 恢复粒子可见并重置初始状态（为下一次播放做准备）
                    if (dotsSvg) {
                        const nodes = Array.from(dotsSvg.querySelectorAll('circle'))
                        nodes.forEach(node => {
                            gsap.set(node, { attr: { r: 0 }, opacity: 1, display: '' })
                        })
                    }
                    // 主时间线回到起点，确保从头开始
                    if (masterTl) {
                        masterTl.time(0)
                    }
                    // 优先使用 driverTl 驱动，避免时间线重复边界的空档
                    if (driverTl) {
                        driverTl.restart().play()
                    } else if (masterTl) {
                        masterTl.restart().play()
                    }
                }
            })
        } else {
            gsap.to(container, {
                '--generate-button-dots-opacity': '0',
                duration: 0.15,
                onComplete: () => {
                    // 暂停驱动与时间线
                    if (driverTl) driverTl.pause()
                    if (masterTl) masterTl.pause()
                }
            })
        }
    }

    /**
     * 销毁：停止动画 → 移除 DOM → 释放引用
     */
    const destroy = (): void => {
        // 停止并销毁所有 GSAP 动画
        kill(driverTl)
        driverTl = null
        kill(masterTl)
        masterTl = null

        // 清理 DOM
        const container = containerEl
        removeChild(container, dotsSvg)
        removeChild(container, strokeGroup)

        // 释放引用
        dotsSvg = null
        strokeGroup = null
        circleProto = null
        containerEl = null
    }

    return {
        init,
        destroy,
        handleAnimation
    }
}
